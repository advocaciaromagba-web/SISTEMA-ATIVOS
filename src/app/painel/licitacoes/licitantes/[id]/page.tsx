import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { formatarDocumento, formatarCep } from "@/lib/validacao";
import { FormularioDocumentoPessoal } from "./documento-form";
import { FormularioEdital } from "./edital-form";
import { FormularioEnvelope } from "./envelope-form";

export const dynamic = "force-dynamic";

const ROTULO_DOCUMENTO: Record<string, string> = {
  RG: "RG",
  CPF: "CPF",
  COMPROVANTE_RESIDENCIA: "Comprovante de residência",
  CONTRATO_SOCIAL: "Contrato social",
  OUTRO: "Outro",
};

export default async function DetalheLicitante({ params }: { params: { id: string } }) {
  const { organizacao } = await exigirSessao();

  const licitante = await prisma.licitanteEmpresa.findFirst({
    where: { id: params.id, organizacaoId: organizacao.id },
    include: {
      documentosPessoais: { orderBy: { enviadoEm: "desc" } },
      envelopes: { orderBy: { criadoEm: "desc" }, include: { editalInteresse: true } },
    },
  });
  if (!licitante) notFound();

  const editais = await prisma.editalInteresse.findMany({
    where: { organizacaoId: organizacao.id },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/painel/licitacoes/licitantes" className="text-sm text-slate-500 hover:underline">
          ← Empresas licitantes
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{licitante.nome}</h1>
          {licitante.microempresaOuEpp && <span className="etiqueta bg-slate-100 text-slate-700">ME/EPP</span>}
        </div>
        <p className="text-sm text-slate-500">{formatarDocumento(licitante.documento)}</p>
      </div>

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
              <Link href={`/painel/licitacoes/licitantes/${licitante.id}/editar`} className="text-sm text-slate-500 hover:underline">
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
