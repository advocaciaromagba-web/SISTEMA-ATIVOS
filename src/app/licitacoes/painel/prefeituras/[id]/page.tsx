import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { formatarDocumento } from "@/lib/validacao";
import { FormularioParticipante } from "./participante-form";
import { BotaoRelerCertame } from "./reler-edital-botao";
import { COR_RECOMENDACAO, ROTULO_RECOMENDACAO } from "./[participanteId]/classificacao-vista";
import { julgarPropostas, ROTULO_CRITERIO, type CriterioJulgamento } from "@/lib/licitacoes/julgamento";
import type { Recomendacao } from "@/lib/licitacoes/classificacao";
import { FormularioProposta } from "./proposta-form";
import { ImportarParticipantes } from "./importar-form";

const moeda = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
import { LeituraEditalVista } from "../../leitura-edital-vista";
import type { LeituraEdital } from "@/lib/licitacoes/leitura-edital";

export const dynamic = "force-dynamic";

const ROTULO_SITUACAO: Record<string, string> = {
  EM_ANALISE: "Em análise",
  QUALIFICADO: "Qualificado",
  INABILITADO: "Inabilitado",
};
const COR_SITUACAO: Record<string, string> = {
  EM_ANALISE: "bg-slate-100 text-slate-700",
  QUALIFICADO: "bg-emerald-100 text-emerald-800",
  INABILITADO: "bg-red-100 text-red-800",
};
const ROTULO_COMPLIANCE: Record<string, string> = {
  SEM_APONTAMENTO: "sem apontamentos",
  ATENCAO: "atenção",
  RESTRICAO: "restrição",
};
const COR_COMPLIANCE: Record<string, string> = {
  SEM_APONTAMENTO: "bg-emerald-100 text-emerald-800",
  ATENCAO: "bg-amber-100 text-amber-800",
  RESTRICAO: "bg-red-100 text-red-800",
};

export default async function DetalheCertame(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { conta } = await exigirSessaoLicitacoes();

  const certame = await prisma.certame.findFirst({
    where: { id: params.id, licitacaoContaId: conta.id },
    include: {
      participantes: { orderBy: { criadoEm: "asc" }, include: { _count: { select: { documentos: true } } } },
    },
  });
  if (!certame) notFound();

  const julgamento = julgarPropostas({
    criterio: certame.criterioJulgamento,
    valorEstimado: certame.valorEstimado ? Number(certame.valorEstimado) : null,
    orcamentoSigiloso: certame.orcamentoSigiloso,
    tipoObjeto: certame.tipoObjeto,
    ehPregao: /preg/i.test(certame.modalidade),
    participantes: certame.participantes.map((p) => ({
      id: p.id,
      nome: p.nome,
      documento: p.documento,
      propostaValor: p.propostaValor ? Number(p.propostaValor) : null,
      propostaSituacao: p.propostaSituacao,
      propostaMotivo: p.propostaMotivo,
      recomendacao: (p.recomendacao as Recomendacao | null) ?? null,
      microempresa: Boolean((p.classificacao as { microempresa?: boolean } | null)?.microempresa),
    })),
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/licitacoes/painel/prefeituras" className="text-sm text-slate-500 hover:underline">
          ← Certames
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {certame.modalidade} nº {certame.numeroCertame}
        </h1>
        <p className="text-sm text-slate-500">
          {certame.orgaoLicitante}
          {certame.objeto ? ` — ${certame.objeto}` : ""}
        </p>
      </div>

      {certame.arquivoEdital && (
        <section className="cartao">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Requisitos de habilitação (leitura automática do edital)</h2>
            <BotaoRelerCertame certameId={certame.id} />
          </div>
          <LeituraEditalVista
            leitura={certame.requisitosExtraidos as unknown as LeituraEdital | null}
            erro={certame.leituraIaErro}
            lidoEm={certame.leituraIaEm}
          />
        </section>
      )}

      <section className="cartao">
        <div className="mb-3">
          <h2 className="text-base font-semibold">Julgamento e resultado</h2>
          <p className="text-sm text-slate-500">
            Critério: {ROTULO_CRITERIO[(certame.criterioJulgamento as CriterioJulgamento) ?? "OUTRO"]}
            {certame.valorEstimado && ` · orçamento estimado ${moeda(Number(certame.valorEstimado))}`}
            {certame.orcamentoSigiloso && " · orçamento sigiloso"}
          </p>
        </div>

        <div
          className={`aviso ${julgamento.vencedor ? "aviso-info" : "aviso-atencao"}`}
        >
          {julgamento.vencedor ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <strong>Vencedora apurada:</strong>
                <span className="font-medium text-slate-900">{julgamento.vencedor.nome}</span>
                <span className="etiqueta bg-emerald-100 text-emerald-800">
                  {moeda(julgamento.vencedor.propostaValor)}
                </span>
              </div>
              <p className="mt-2">{julgamento.justificativa}</p>
            </>
          ) : (
            <>
              <strong className="block">Sem vencedora apurada</strong>
              <p className="mt-1">{julgamento.justificativa}</p>
            </>
          )}
        </div>

        {julgamento.empateFicto && (
          <div className="aviso-atencao mt-3">
            <strong className="block">Empate ficto de ME/EPP a resolver</strong>
            <p className="mt-1">{julgamento.empateFicto.detalhe}</p>
          </div>
        )}

        {julgamento.pendencias.length > 0 && (
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
            {julgamento.pendencias.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        )}

        {julgamento.ordem.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Participante</th>
                  <th>Proposta</th>
                  <th>Situação da proposta</th>
                  <th>Habilitação</th>
                </tr>
              </thead>
              <tbody>
                {julgamento.ordem.map((i) => (
                  <tr key={i.participanteId} className={julgamento.vencedor?.participanteId === i.participanteId ? "bg-emerald-50" : ""}>
                    <td className="text-slate-600">{i.posicao ?? "—"}</td>
                    <td>
                      <Link
                        href={`/licitacoes/painel/prefeituras/${certame.id}/${i.participanteId}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {i.nome}
                      </Link>
                      {i.alertas.map((a, k) => (
                        <div key={k} className="mt-0.5 text-xs text-amber-700">
                          {a}
                        </div>
                      ))}
                    </td>
                    <td className="text-slate-700">{moeda(i.propostaValor)}</td>
                    <td>
                      {i.situacaoProposta === "CLASSIFICADA" && (
                        <span className="etiqueta bg-emerald-100 text-emerald-800">classificada</span>
                      )}
                      {i.situacaoProposta === "DESCLASSIFICADA" && (
                        <>
                          <span className="etiqueta bg-red-100 text-red-800">desclassificada</span>
                          {i.motivoDesclassificacao && (
                            <div className="mt-0.5 text-xs text-slate-500">{i.motivoDesclassificacao}</div>
                          )}
                        </>
                      )}
                      {i.situacaoProposta === "SEM_PROPOSTA" && (
                        <span className="etiqueta bg-slate-100 text-slate-600">sem proposta</span>
                      )}
                    </td>
                    <td>
                      {i.recomendacaoHabilitacao ? (
                        <span className={`etiqueta ${COR_RECOMENDACAO[i.recomendacaoHabilitacao]}`}>
                          {ROTULO_RECOMENDACAO[i.recomendacaoHabilitacao]}
                        </span>
                      ) : (
                        <span className="etiqueta bg-slate-100 text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500">
          A apuração é automática e serve de insumo: a adjudicação e a homologação são atos da autoridade
          competente. O que este quadro faz é não deixar passar quem está à frente na ordem e ainda não teve a
          documentação examinada.
        </p>
      </section>

      <section className="cartao">
        <h2 className="mb-1 text-base font-semibold">Participantes</h2>
        <p className="mb-4 text-sm text-slate-500">
          A documentação de cada um é conferida quanto à autenticidade e à assinatura antes da qualificação final.
        </p>

        {certame.participantes.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>CNPJ</th>
                  <th>Proposta</th>
                  <th>Documentos</th>
                  <th>Compliance</th>
                  <th>Recomendação</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {certame.participantes.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/licitacoes/painel/prefeituras/${certame.id}/${p.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {p.nome}
                      </Link>
                    </td>
                    <td className="text-slate-600">{formatarDocumento(p.documento) || "—"}</td>
                    <td>
                      <FormularioProposta
                        certameId={certame.id}
                        participanteCertameId={p.id}
                        valorAtual={p.propostaValor ? String(Number(p.propostaValor).toFixed(2)).replace(".", ",") : null}
                        desclassificada={p.propostaSituacao === "DESCLASSIFICADA"}
                      />
                    </td>
                    <td className="text-slate-600">{p._count.documentos}</td>
                    <td>
                      {p.complianceIdoneidade ? (
                        <span className={`etiqueta ${COR_COMPLIANCE[p.complianceIdoneidade] ?? "bg-slate-100 text-slate-700"}`}>
                          {ROTULO_COMPLIANCE[p.complianceIdoneidade] ?? p.complianceIdoneidade}
                        </span>
                      ) : (
                        <span className="etiqueta bg-slate-100 text-slate-600">—</span>
                      )}
                    </td>
                    <td>
                      {p.recomendacao ? (
                        <span className={`etiqueta ${COR_RECOMENDACAO[p.recomendacao] ?? "bg-slate-100 text-slate-700"}`}>
                          {ROTULO_RECOMENDACAO[p.recomendacao] ?? p.recomendacao}
                        </span>
                      ) : (
                        <span className="etiqueta bg-slate-100 text-slate-600">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`etiqueta ${COR_SITUACAO[p.situacao] ?? "bg-slate-100 text-slate-700"}`}>
                        {ROTULO_SITUACAO[p.situacao] ?? p.situacao}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <FormularioParticipante certameId={certame.id} />

        <div className="mt-6 border-t border-slate-100 pt-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Cadastrar vários de uma vez</h3>
          <p className="mb-3 text-sm text-slate-500">
            Cole a lista de quem se apresentou ao certame. Todos entram na hora; a verificação de cada um roda em
            seguida, uma empresa por vez, com o andamento à vista.
          </p>
          <ImportarParticipantes
            certameId={certame.id}
            pendentes={certame.participantes.filter((p) => p.complianceEm == null && p.documento).length}
          />
        </div>
      </section>
    </div>
  );
}
