import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { formatarDocumento, formatarCep } from "@/lib/validacao";
import { FormularioDocumentoPessoal } from "./documento-form";
import { FormularioEdital } from "./edital-form";
import { FormularioEnvelope } from "./envelope-form";
import { LiberacaoLicitante } from "./liberacao";

export const dynamic = "force-dynamic";

const ROTULO_DOCUMENTO: Record<string, string> = {
  RG: "RG",
  CPF: "CPF",
  COMPROVANTE_RESIDENCIA: "Comprovante de residência",
  CONTRATO_SOCIAL: "Contrato social",
  OUTRO: "Outro",
};

export default async function DetalheLicitante({ params }: { params: { id: string } }) {
  const { usuario, conta } = await exigirSessaoLicitacoes();

  const licitante = await prisma.licitanteEmpresa.findFirst({
    where: { id: params.id, licitacaoContaId: conta.id },
    include: {
      documentosPessoais: { orderBy: { enviadoEm: "desc" } },
      envelopes: { orderBy: { criadoEm: "desc" }, include: { editalInteresse: true } },
      auditorias: { orderBy: { criadoEm: "desc" }, take: 1 },
    },
  });
  if (!licitante) notFound();

  const ultimaAuditoria = licitante.auditorias[0] ?? null;

  const editais = await prisma.editalInteresse.findMany({
    where: { licitacaoContaId: conta.id },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/licitacoes/painel/licitantes" className="text-sm text-slate-500 hover:underline">
          ← Empresas licitantes
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{licitante.nome}</h1>
          {licitante.microempresaOuEpp && <span className="etiqueta bg-slate-100 text-slate-700">ME/EPP</span>}
        </div>
        <p className="text-sm text-slate-500">{formatarDocumento(licitante.documento)}</p>
      </div>

      <PainelCompliance
        licitante={licitante}
        auditoria={ultimaAuditoria}
        ehDono={usuario.papel === "DONO"}
        liberacao={
          licitante.liberadaEm
            ? {
                justificativa: licitante.justificativaLiberacao ?? "",
                por: licitante.liberadaPorNome,
                em: licitante.liberadaEm.toLocaleDateString("pt-BR"),
              }
            : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ---- documentos pessoais ---- */}
          <section className="cartao">
            <h2 className="mb-1 text-base font-semibold">Documentos pessoais</h2>
            <p className="mb-4 text-sm text-slate-500">
              O que as declarações geradas não cobrem: RG, comprovante de residência e afins. Só a própria empresa
              consegue apresentar isto.
            </p>

            {licitante.documentosPessoais.length > 0 && (
              <ul className="mb-4 divide-y divide-slate-100 text-sm">
                {licitante.documentosPessoais.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <span className="etiqueta bg-slate-100 text-slate-700">
                        {ROTULO_DOCUMENTO[d.tipo] ?? d.tipo}
                      </span>
                      <span className="ml-2 text-slate-600">{d.nomeArquivo}</span>
                    </div>
                    <span className="text-xs text-slate-400">{d.enviadoEm.toLocaleDateString("pt-BR")}</span>
                  </li>
                ))}
              </ul>
            )}

            <FormularioDocumentoPessoal licitanteEmpresaId={licitante.id} />
          </section>

          {/* ---- envelopes gerados ---- */}
          <section className="cartao">
            <h2 className="mb-1 text-base font-semibold">Envelopes</h2>
            <p className="mb-4 text-sm text-slate-500">
              As declarações padronizadas, identificadas com o certame, mais os documentos pessoais anexados.
            </p>

            {licitante.envelopes.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum envelope gerado ainda.</p>
            ) : (
              <ul className="mb-4 divide-y divide-slate-100 text-sm">
                {licitante.envelopes.map((e) => (
                  <li key={e.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-900">
                        {e.editalInteresse.modalidade} nº {e.editalInteresse.numeroCertame}
                      </span>
                      <span
                        className={`etiqueta ${
                          e.status === "COMPLETO"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {e.status === "COMPLETO" ? "completo" : "faltam documentos pessoais"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{e.editalInteresse.orgaoLicitante}</div>
                  </li>
                ))}
              </ul>
            )}

            <FormularioEnvelope licitanteEmpresaId={licitante.id} editais={editais} />
          </section>

          {/* ---- editais de interesse ---- */}
          <section className="cartao">
            <h2 className="mb-1 text-base font-semibold">Cadastrar edital de interesse</h2>
            <p className="mb-4 text-sm text-slate-500">
              Traga o edital que quer participar. É dele que sai o órgão, a modalidade e o número que identificam o
              envelope.
            </p>
            <FormularioEdital />
          </section>
        </div>

        <div className="space-y-6">
          <section className="cartao">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Dados</h2>
              <Link href={`/licitacoes/painel/licitantes/${licitante.id}/editar`} className="text-sm text-slate-500 hover:underline">
                editar
              </Link>
            </div>
            <dl className="space-y-2.5 text-sm">
              <Linha rotulo="Inscrição estadual" valor={licitante.inscricaoEstadual} />
              <Linha rotulo="E-mail" valor={licitante.emailContato} />
              <Linha rotulo="Telefone" valor={licitante.telefone} />
              <Linha
                rotulo="Endereço"
                valor={
                  licitante.enderecoRua
                    ? `${licitante.enderecoRua}, ${licitante.enderecoNumero ?? "s/n"} — ${licitante.enderecoCidade ?? ""}/${licitante.enderecoUf ?? ""} ${formatarCep(licitante.enderecoCep) ?? ""}`
                    : null
                }
              />
              <Linha rotulo="Representante" valor={licitante.repNome} />
              <Linha rotulo="Cargo" valor={licitante.repCargo} />
              <Linha rotulo="CPF do representante" valor={licitante.repCpf} />
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="text-slate-800">{valor}</dd>
    </div>
  );
}

const ROTULO_IDONEIDADE: Record<string, string> = {
  SEM_APONTAMENTO: "sem apontamentos",
  ATENCAO: "atenção",
  RESTRICAO: "restrição",
};
const COR_IDONEIDADE: Record<string, string> = {
  SEM_APONTAMENTO: "bg-emerald-100 text-emerald-800",
  ATENCAO: "bg-amber-100 text-amber-800",
  RESTRICAO: "bg-red-100 text-red-800",
};

type Apontamento = { gravidade: string; titulo: string; detalhe: string; fonte: string };

/**
 * O resultado da auditoria automática — insumo, não trava. Só bloqueia a
 * geração de envelope indiretamente, pelo aviso: a decisão de seguir mesmo
 * com restrição continua sendo de quem opera.
 */
function PainelCompliance({
  licitante,
  auditoria,
  ehDono,
  liberacao,
}: {
  licitante: {
    id: string;
    situacaoCompliance: string | null;
    complianceEm: Date | null;
    capacidadePagamento: string | null;
    pontuacao: number | null;
    bloqueada: boolean;
  };
  auditoria: { parecer: string | null; apontamentos: unknown } | null;
  ehDono: boolean;
  liberacao: { justificativa: string; por: string | null; em: string } | null;
}) {
  if (!licitante.situacaoCompliance) {
    return (
      <div className="aviso-atencao">
        <strong className="block">Ainda não auditada</strong>
        <span className="mt-1 block">
          Sem CNPJ válido no cadastro a auditoria não roda. Complete o cadastro e salve novamente.
        </span>
      </div>
    );
  }

  const apontamentos = (auditoria?.apontamentos as Apontamento[] | null) ?? [];
  const cor = COR_IDONEIDADE[licitante.situacaoCompliance] ?? "bg-slate-100 text-slate-700";

  return (
    <div className={`aviso ${licitante.situacaoCompliance === "RESTRICAO" ? "aviso-erro" : "aviso-info"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <strong>Compliance:</strong>
        <span className={`etiqueta ${cor}`}>{ROTULO_IDONEIDADE[licitante.situacaoCompliance] ?? licitante.situacaoCompliance}</span>
        {licitante.pontuacao != null && <span className="text-xs text-slate-500">pontuação {licitante.pontuacao}/100</span>}
        {licitante.complianceEm && (
          <span className="text-xs text-slate-500">
            auditado em {new Date(licitante.complianceEm).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
      {auditoria?.parecer && <p className="mt-2">{auditoria.parecer}</p>}
      {apontamentos.length > 0 && (
        <ul className="mt-2 list-inside list-disc space-y-1">
          {apontamentos.map((a, i) => (
            <li key={i}>
              <span className="font-medium">{a.titulo}</span> — {a.detalhe}
            </li>
          ))}
        </ul>
      )}
      <LiberacaoLicitante
        licitanteEmpresaId={licitante.id}
        bloqueada={licitante.bloqueada}
        ehDono={ehDono}
        liberacao={liberacao}
      />
    </div>
  );
}
