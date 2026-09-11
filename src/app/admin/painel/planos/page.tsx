import Link from "next/link";
import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { SOLUCOES_ADMIN, modelo } from "@/lib/admin/solucoes";
import { todosOsPlanosDaSolucao, configuracaoDaSolucao } from "@/lib/planos-solucao";
import { moeda } from "@/lib/formato";
import { custoIaPorSolucaoDesde } from "@/lib/ia/custo";
import { FormularioPlano, FormularioConfiguracao } from "./formularios";

export const dynamic = "force-dynamic";

/** Custo de IA é em dólar — nunca convertido para real aqui, pra não fingir uma cotação que o sistema não guarda. */
function usd(v: number | null): string {
  if (v === null) return "não calculado";
  if (v > 0 && v < 1) return `US$ ${v.toFixed(4)}`;
  return `US$ ${v.toFixed(2)}`;
}

export default async function PlanosAdmin() {
  await exigirSessaoAdmin();

  const inicioDoMes = new Date();
  inicioDoMes.setDate(1);
  inicioDoMes.setHours(0, 0, 0, 0);
  const custoIaPorSolucao = await custoIaPorSolucaoDesde(inicioDoMes);

  const solucoes = await Promise.all(
    SOLUCOES_ADMIN.map(async (s) => ({
      ...s,
      planos: await todosOsPlanosDaSolucao(s.chave),
      config: await configuracaoDaSolucao(s.chave),
      assinantesAtivos: await modelo(s.modeloConta).count({ where: { statusAssinatura: "ATIVA" } }),
      custoIa: custoIaPorSolucao[s.chave] ?? null,
    }))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Planos e preços</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cada solução tem os preços dela. Nada é compartilhado: duas soluções podem ter um plano com o mesmo nome e
          valores completamente diferentes, e alterar uma não mexe na outra.
        </p>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">Alterar preço vale para novas assinaturas.</p>
        <p className="mt-0.5">
          Quem já assinou continua sendo cobrado pelo valor contratado — a cobrança recorrente foi criada no Asaas com
          aquele preço e não muda sozinha. Para reajustar quem já é cliente é preciso tratar cada assinatura, e isso
          tem regra própria de aviso prévio. Toda alteração aqui fica registrada na auditoria, com o valor antes e
          depois.
        </p>
      </div>

      {solucoes.map((s) => (
        <section key={s.chave} className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
            <h2 className="text-base font-semibold text-slate-900">{s.rotulo}</h2>
            <span className="text-xs text-slate-400">{s.chave}</span>
          </div>

          <div className="cartao">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Custo de IA desta solução, para ajudar a decidir o preço</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Assinantes ativos</p>
                <p className="text-lg font-semibold text-slate-900">{s.assinantesAtivos}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Custo de IA no mês</p>
                <p className="text-lg font-semibold text-slate-900">
                  {usd(s.custoIa?.custoUsd ?? null)}
                  {s.custoIa && s.custoIa.semPreco > 0 && <span className="ml-1 text-xs font-normal text-amber-600">(parcial)</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Custo médio de IA por assinante</p>
                <p className="text-lg font-semibold text-slate-900">
                  {s.custoIa?.custoUsd !== null && s.custoIa?.custoUsd !== undefined && s.assinantesAtivos > 0
                    ? usd(s.custoIa.custoUsd / s.assinantesAtivos)
                    : "—"}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Em dólar (é como Anthropic e OpenAI cobram) — compare com o preço em real abaixo, sem conversão
              automática. Não inclui hospedagem, consultas a terceiros nem demais custos operacionais. Detalhe por
              provedor de IA em{" "}
              <Link href="/admin/painel/custos" className="underline">
                Custos do sistema
              </Link>
              .
            </p>
          </div>

          <div className="cartao">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Teste grátis desta solução</p>
            <FormularioConfiguracao
              solucao={s.chave}
              diasDeTeste={s.config.diasDeTeste}
              consultasGratisTeste={s.config.consultasGratisTeste}
            />
          </div>

          {s.planos.length === 0 ? (
            <div className="cartao text-sm text-slate-500">
              <p>
                Sem planos de assinatura.
                {s.chave === "CONSULTA_CADASTRAL_SERASA"
                  ? " Esta solução funciona por saldo pré-pago, então não tem mensalidade — o que é uma decisão de produto, não uma falta de cadastro."
                  : " Enquanto não houver plano cadastrado, a página de planos desta solução não mostra nada para vender."}
              </p>
              <div className="mt-3">
                <FormularioPlano solucao={s.chave} novo />
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Plano</th>
                      <th className="px-4 py-3">Mensal</th>
                      <th className="px-4 py-3">Anual</th>
                      <th className="px-4 py-3">Situação</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.planos.map((p) => (
                      <tr key={p.chave} className="border-b border-slate-100 align-top last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">
                            {p.nome}
                            {p.destaque && (
                              <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                                recomendado
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{p.paraQuem ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{moeda(p.precoMensal)}</td>
                        <td className="px-4 py-3 text-slate-700">{moeda(p.precoAnual)}</td>
                        <td className="px-4 py-3">
                          {p.ativo ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              à venda
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                              fora de venda
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <FormularioPlano solucao={s.chave} plano={p} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <FormularioPlano solucao={s.chave} novo />
            </>
          )}
        </section>
      ))}
    </div>
  );
}
