import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { formatarDocumento } from "@/lib/validacao";
import { FormularioDocumentoParticipante } from "./documento-form";
import { BotoesAutenticidade } from "./autenticidade-botoes";
import { FormularioAssinatura } from "./assinatura-form";
import { FormularioParecer } from "./parecer-form";
import { ClassificacaoVista } from "./classificacao-vista";
import { BotaoReauditarParticipante } from "./reauditar-botao";
import { documentoHabilitacao } from "@/lib/licitacoes/requisitos";
import type { ClassificacaoParticipante } from "@/lib/licitacoes/classificacao";
import type { LeituraDocumento, AchadoDocumento } from "@/lib/licitacoes/leitura-documento";

export const dynamic = "force-dynamic";

const COR_ACHADO_DOC: Record<string, string> = {
  OK: "text-emerald-700",
  ALERTA: "text-amber-700",
  DIVERGENCIA: "text-red-700",
};

/** O que a leitura automática extraiu do arquivo e o que ela conferiu. */
function ConferenciaDoDocumento({
  leitura,
  erro,
  achados,
}: {
  leitura: LeituraDocumento | null;
  erro: string | null;
  achados: AchadoDocumento[] | null;
}) {
  if (erro) {
    return <p className="mt-3 text-xs text-slate-500">Leitura automática não concluída: {erro}</p>;
  }
  if (!leitura) return null;

  return (
    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-700">Leitura automática</p>
      <dl className="mt-1 grid gap-x-4 gap-y-0.5 text-xs text-slate-600 sm:grid-cols-2">
        {leitura.titular && <div>Titular: {leitura.titular}</div>}
        {leitura.documentoTitular && <div>CNPJ/CPF: {leitura.documentoTitular}</div>}
        {leitura.orgaoEmissor && <div>Órgão: {leitura.orgaoEmissor}</div>}
        {leitura.emitidaEm && <div>Emitida em: {leitura.emitidaEm}</div>}
        {leitura.validaAte && <div>Válida até: {leitura.validaAte}</div>}
      </dl>

      {achados && achados.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs">
          {achados.map((a, i) => (
            <li key={i} className={COR_ACHADO_DOC[a.tipo] ?? "text-slate-600"}>
              <span className="font-medium">{a.titulo}</span> — {a.detalhe}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** O rótulo sai da própria taxonomia de habilitação — lista paralela divergiria. */
const rotuloDocumento = (tipo: string): string =>
  tipo === "OUTRO" ? "Outro" : documentoHabilitacao(tipo)?.nome ?? tipo;

export default async function DetalheParticipante(
  props: {
    params: Promise<{ id: string; participanteId: string }>;
  }
) {
  const params = await props.params;
  const { conta } = await exigirSessaoLicitacoes();

  const certame = await prisma.certame.findFirst({ where: { id: params.id, licitacaoContaId: conta.id } });
  if (!certame) notFound();

  const participante = await prisma.participanteCertame.findFirst({
    where: { id: params.participanteId, certameId: certame.id },
    include: {
      documentos: { orderBy: { enviadoEm: "desc" }, include: { assinatura: true } },
      auditorias: { orderBy: { criadoEm: "desc" }, take: 1 },
    },
  });
  if (!participante) notFound();

  const ultimaAuditoria = participante.auditorias[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/licitacoes/painel/prefeituras/${certame.id}`} className="text-sm text-slate-500 hover:underline">
          ← {certame.modalidade} nº {certame.numeroCertame}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{participante.nome}</h1>
        <p className="text-sm text-slate-500">{formatarDocumento(participante.documento)}</p>
      </div>

      <PainelCompliance participante={participante} auditoria={ultimaAuditoria} />

      <section className="cartao">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Classificação automática</h2>
            <p className="text-sm text-slate-500">
              Cruza o que o edital exige, o que foi apresentado e o que a verificação da empresa encontrou.
            </p>
          </div>
          <BotaoReauditarParticipante participanteCertameId={participante.id} certameId={certame.id} />
        </div>
        <ClassificacaoVista
          classificacao={participante.classificacao as unknown as ClassificacaoParticipante | null}
          classificadoEm={participante.classificadoEm}
        />
      </section>

      <section className="cartao">
        <h2 className="mb-1 text-base font-semibold">Documentos apresentados</h2>
        <p className="mb-4 text-sm text-slate-500">
          Para cada um: confira se o conteúdo confere com a fonte oficial e valide a assinatura antes de decidir a
          qualificação.
        </p>

        <div className="space-y-4">
          {participante.documentos.map((d) => (
            <div key={d.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="etiqueta bg-slate-100 text-slate-700">
                    {rotuloDocumento(d.tipo)}
                  </span>
                  <span className="ml-2 text-sm text-slate-700">{d.nomeArquivo}</span>
                </div>
                <BotoesAutenticidade
                  documentoId={d.id}
                  certameId={certame.id}
                  participanteCertameId={participante.id}
                  atual={d.autenticidadeResultado}
                />
              </div>

              <ConferenciaDoDocumento
                leitura={d.leituraIa as unknown as LeituraDocumento | null}
                erro={d.leituraIaErro}
                achados={d.conferenciaAutomatica as unknown as AchadoDocumento[] | null}
              />

              <FormularioAssinatura
                documentoId={d.id}
                certameId={certame.id}
                participanteCertameId={participante.id}
                validacao={d.assinatura}
              />
            </div>
          ))}

          {participante.documentos.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum documento anexado ainda.</p>
          )}
        </div>

        <div className="mt-4">
          <FormularioDocumentoParticipante certameId={certame.id} participanteCertameId={participante.id} />
        </div>
      </section>

      <section className="cartao">
        <h2 className="mb-1 text-base font-semibold">Parecer</h2>
        <p className="mb-4 text-sm text-slate-500">
          A decisão final é sempre da comissão de licitação — este registro apoia, não substitui.
        </p>
        <FormularioParecer
          certameId={certame.id}
          participanteCertameId={participante.id}
          situacaoAtual={participante.situacao}
        />
      </section>
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

type Apontamento = { titulo: string; detalhe: string };

/**
 * O resultado automático da verificação — Receita, dívida ativa, sanções,
 * punições. É insumo para a comissão, nunca a qualificação em si: quem
 * qualifica ou inabilita é sempre a decisão humana registrada no parecer
 * abaixo.
 */
function PainelCompliance({
  participante,
  auditoria,
}: {
  participante: { complianceIdoneidade: string | null; complianceEm: Date | null; compliancePontuacao: number | null };
  auditoria: { parecer: string | null; apontamentos: unknown } | null;
}) {
  if (!participante.complianceIdoneidade) {
    return (
      <div className="aviso-atencao">
        <strong className="block">Verificação automática ainda não rodou</strong>
        <span className="mt-1 block">Sem CNPJ válido cadastrado a verificação não roda.</span>
      </div>
    );
  }

  const apontamentos = (auditoria?.apontamentos as Apontamento[] | null) ?? [];
  const cor = COR_IDONEIDADE[participante.complianceIdoneidade] ?? "bg-slate-100 text-slate-700";

  return (
    <div className={`aviso ${participante.complianceIdoneidade === "RESTRICAO" ? "aviso-erro" : "aviso-info"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <strong>Verificação automática:</strong>
        <span className={`etiqueta ${cor}`}>
          {ROTULO_IDONEIDADE[participante.complianceIdoneidade] ?? participante.complianceIdoneidade}
        </span>
        {participante.compliancePontuacao != null && (
          <span className="text-xs text-slate-500">pontuação {participante.compliancePontuacao}/100</span>
        )}
        {participante.complianceEm && (
          <span className="text-xs text-slate-500">
            em {new Date(participante.complianceEm).toLocaleDateString("pt-BR")}
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
    </div>
  );
}
