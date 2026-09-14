import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessaoCompliance } from "@/lib/compliance/sessao";
import { formatarNumeroProcessoCnj } from "@/lib/validacao";
import { dataCurta } from "@/lib/formato";
import { BotaoReanalisar } from "./reanalisar-botao";
import type { RegularidadeProcesso } from "@/lib/auditoria/processo";

export const dynamic = "force-dynamic";

const ROTULO_SITUACAO: Record<string, string> = {
  REGULAR: "regular",
  ATENCAO: "atenção",
  IRREGULAR: "irregular",
};
const COR_SITUACAO: Record<string, string> = {
  REGULAR: "bg-emerald-100 text-emerald-800",
  ATENCAO: "bg-amber-100 text-amber-800",
  IRREGULAR: "bg-red-100 text-red-800",
};
const ROTULO_BINARIA: Record<string, string> = { SIM: "sim", NAO: "não", NAO_CONSTA: "não consta na base do CNJ" };

export default async function DetalheProcesso(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { conta } = await exigirSessaoCompliance();

  const processo = await prisma.complianceProcesso.findFirst({
    where: { id: params.id, complianceContaId: conta.id },
    include: { analises: { orderBy: { criadoEm: "desc" }, take: 1 } },
  });
  if (!processo) notFound();

  const ultimaAnalise = processo.analises[0] ?? null;
  const leitura = (ultimaAnalise?.leitura as unknown as RegularidadeProcesso | null) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/compliance/painel/processos" className="text-sm text-slate-500 hover:underline">
          ← Processos
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{processo.apelido || formatarNumeroProcessoCnj(processo.numeroProcesso)}</h1>
        <p className="text-sm text-slate-500">{formatarNumeroProcessoCnj(processo.numeroProcesso)}</p>
      </div>

      {processo.situacaoRegularidade ? (
        <div className={`aviso ${processo.situacaoRegularidade === "IRREGULAR" ? "aviso-erro" : "aviso-info"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <strong>Regularidade processual:</strong>
            <span className={`etiqueta ${COR_SITUACAO[processo.situacaoRegularidade] ?? "bg-slate-100 text-slate-700"}`}>
              {ROTULO_SITUACAO[processo.situacaoRegularidade] ?? processo.situacaoRegularidade}
            </span>
            {processo.faseAtual && <span className="text-xs text-slate-500">fase: {processo.faseAtual}</span>}
            {processo.analisadoEm && (
              <span className="text-xs text-slate-500">analisado em {dataCurta(processo.analisadoEm)}</span>
            )}
            <span className="ml-auto">
              <BotaoReanalisar processoId={processo.id} />
            </span>
          </div>
          {leitura?.parecer && <p className="mt-3 whitespace-pre-line">{leitura.parecer}</p>}
        </div>
      ) : (
        <div className="aviso-atencao flex items-center justify-between gap-3">
          <span>
            {ultimaAnalise?.erro ? `Análise não concluída: ${ultimaAnalise.erro}` : "Ainda não analisado."}
          </span>
          <BotaoReanalisar processoId={processo.id} />
        </div>
      )}

      {leitura && (
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="cartao">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Trânsito em julgado</h2>
            <p className="text-sm text-slate-700">
              {ROTULO_BINARIA[leitura.transitoEmJulgado.situacao]}
              {leitura.transitoEmJulgado.data ? ` — ${leitura.transitoEmJulgado.data}` : ""}
            </p>
            {leitura.transitoEmJulgado.detalhe && (
              <p className="mt-1 text-xs text-slate-500">{leitura.transitoEmJulgado.detalhe}</p>
            )}
          </section>

          <section className="cartao">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Homologação de cálculos</h2>
            <p className="text-sm text-slate-700">
              {ROTULO_BINARIA[leitura.homologacaoCalculo.situacao]}
              {leitura.homologacaoCalculo.data ? ` — ${leitura.homologacaoCalculo.data}` : ""}
            </p>
            {leitura.homologacaoCalculo.detalhe && (
              <p className="mt-1 text-xs text-slate-500">{leitura.homologacaoCalculo.detalhe}</p>
            )}
          </section>

          <section className="cartao">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Recursos</h2>
            <p className="text-sm text-slate-700">{leitura.recursos.pendentes ? "há recurso pendente" : "sem recurso pendente identificado"}</p>
            {leitura.recursos.detalhe && <p className="mt-1 text-xs text-slate-500">{leitura.recursos.detalhe}</p>}
          </section>

          <section className="cartao">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Decisões conflitantes</h2>
            <p className="text-sm text-slate-700">
              {leitura.decisoesConflitantes.existe ? "sim" : "nenhuma identificada"}
            </p>
            {leitura.decisoesConflitantes.detalhe && (
              <p className="mt-1 text-xs text-slate-500">{leitura.decisoesConflitantes.detalhe}</p>
            )}
          </section>

          {leitura.sessoes.length > 0 && (
            <section className="cartao sm:col-span-2">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Sessões de julgamento</h2>
              <ul className="space-y-1.5 text-sm">
                {leitura.sessoes.map((s, i) => (
                  <li key={i}>
                    <span className="font-medium text-slate-900">{s.data || "data não identificada"}</span>{" "}
                    <span className="text-slate-600">— {s.descricao}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {leitura.pendencias.length > 0 && (
            <section className="cartao">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Pendências</h2>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                {leitura.pendencias.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>
          )}

          {leitura.constricoes.length > 0 && (
            <section className="cartao">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Constrições (penhora, bloqueio, cessão)</h2>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                {leitura.constricoes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
