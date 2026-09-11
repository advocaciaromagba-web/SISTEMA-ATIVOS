import Link from "next/link";
import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { prisma } from "@/lib/prisma";
import { SOLUCOES_ADMIN, modelo } from "@/lib/admin/solucoes";
import { todosOsPlanosDaSolucao } from "@/lib/planos-solucao";
import { moeda } from "@/lib/formato";
import { asaasConfigurado } from "@/lib/asaas/cliente";
import { custoIaPorSolucaoDesde } from "@/lib/ia/custo";

export const dynamic = "force-dynamic";

/** Custo de IA é em dólar (é assim que Anthropic e OpenAI cobram) — nunca convertido para real, pra não fingir uma cotação. */
function usd(v: number | null): string {
  if (v === null) return "não calculado";
  if (v > 0 && v < 1) return `US$ ${v.toFixed(4)}`;
  return `US$ ${v.toFixed(2)}`;
}

/** Consultas pagas a terceiros, por solução. O modelo de cada uma é diferente. */
const MODELOS_CONSULTA: { rotulo: string; modelo: string }[] = [
  { rotulo: "Gestão de ativos", modelo: "consulta" },
  { rotulo: "Licitações (empresa)", modelo: "licitanteConsulta" },
  { rotulo: "Licitações (participantes)", modelo: "participanteConsulta" },
  { rotulo: "Compliance de empresas", modelo: "complianceConsulta" },
  { rotulo: "Consulta cadastral", modelo: "serasaConsulta" },
  { rotulo: "Due diligence de pessoas", modelo: "diligenciaConsulta" },
];

export default async function FinanceiroAdmin() {
  await exigirSessaoAdmin();

  const inicioDoMes = new Date();
  inicioDoMes.setDate(1);
  inicioDoMes.setHours(0, 0, 0, 0);

  // ----- Receita realmente recebida: pedidos avulsos pagos -----
  const [pedidosPagos, pedidosPendentes, pedidosDoMes] = await Promise.all([
    prisma.pedido.aggregate({ _sum: { valorTotal: true }, _count: true, where: { situacao: "PAGO" } }),
    prisma.pedido.aggregate({ _sum: { valorTotal: true }, _count: true, where: { situacao: "AGUARDANDO_PAGAMENTO" } }),
    prisma.pedido.aggregate({ _sum: { valorTotal: true }, _count: true, where: { situacao: "PAGO", pagoEm: { gte: inicioDoMes } } }),
  ]);

  // ----- Custo de IA no mês, por solução (todos os provedores somados) -----
  const custoIaPorSolucao = await custoIaPorSolucaoDesde(inicioDoMes);

  // ----- Assinaturas por plano, em cada solução -----
  const assinaturas = await Promise.all(
    SOLUCOES_ADMIN.map(async (s) => {
      const m = modelo(s.modeloConta);
      // A Consulta cadastral não tem campo `plano` (é saldo pré-pago): filtrar
      // por plano nela derruba a consulta inteira.
      const contarPlano = (plano: string) =>
        s.temPlano ? m.count({ where: { statusAssinatura: "ATIVA", plano } }) : Promise.resolve(0);

      // Os planos e os preços são os DESTA solução. Antes esta conta usava uma
      // tabela única para todas — o que dava um número errado no momento em que
      // duas soluções passassem a cobrar valores diferentes.
      const planos = s.temPlano ? await todosOsPlanosDaSolucao(s.chave) : [];

      const [teste, inadimplentes, ativas] = await Promise.all([
        m.count({ where: { statusAssinatura: "TESTE" } }),
        m.count({ where: { statusAssinatura: "INADIMPLENTE" } }),
        m.count({ where: { statusAssinatura: "ATIVA" } }),
      ]);

      const porPlano = await Promise.all(
        planos.map(async (p) => {
          const assinantes = await contarPlano(p.chave);
          return { chave: p.chave, nome: p.nome, precoMensal: p.precoMensal, assinantes };
        })
      );

      const mensal = porPlano.reduce((soma, p) => soma + p.assinantes * p.precoMensal, 0);
      const custoIa = custoIaPorSolucao[s.chave] ?? null;

      return { ...s, porPlano, teste, inadimplentes, ativas, mensal, custoIa };
    })
  );

  const recorrenteMensal = assinaturas.reduce((s, a) => s + a.mensal, 0);
  const totalInadimplentes = assinaturas.reduce((s, a) => s + a.inadimplentes, 0);
  const totalEmTeste = assinaturas.reduce((s, a) => s + a.teste, 0);

  // ----- Consultas pagas a terceiros: quantidade (custo não é registrado) -----
  const consultas = await Promise.all(
    MODELOS_CONSULTA.map(async (c) => {
      try {
        const [total, mes] = await Promise.all([
          modelo(c.modelo).count(),
          modelo(c.modelo).count({ where: { criadoEm: { gte: inicioDoMes } } }),
        ]);
        return { ...c, total, mes };
      } catch {
        return { ...c, total: 0, mes: 0 };
      }
    })
  );

  const consultasNoMes = consultas.reduce((s, c) => s + c.mes, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Financeiro</h1>
        <p className="mt-1 text-sm text-slate-500">
          Valores lidos das tabelas do próprio sistema. Onde o número é calculado a partir da tabela de preços, está
          dito.
        </p>
      </div>

      {!asaasConfigurado() && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-semibold">Asaas não está configurado neste ambiente.</span> Sem a chave, o sistema não
          cria cobrança nem assinatura recorrente — os números abaixo vêm só do que está gravado no banco.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero
          rotulo="Recebido no mês"
          valor={moeda(Number(pedidosDoMes._sum.valorTotal ?? 0))}
          detalhe={`${pedidosDoMes._count} pedido(s) avulso(s) pago(s)`}
        />
        <Numero
          rotulo="Recebido no total"
          valor={moeda(Number(pedidosPagos._sum.valorTotal ?? 0))}
          detalhe={`${pedidosPagos._count} pedido(s) pago(s)`}
        />
        <Numero
          rotulo="A receber"
          valor={moeda(Number(pedidosPendentes._sum.valorTotal ?? 0))}
          detalhe={`${pedidosPendentes._count} aguardando pagamento`}
        />
        <Numero
          rotulo="Recorrente por mês"
          valor={moeda(recorrenteMensal)}
          detalhe="assinaturas ativas × tabela de preços"
        />
      </div>

      {(totalInadimplentes > 0 || totalEmTeste > 0) && (
        <div className="flex flex-wrap gap-4 text-sm">
          {totalInadimplentes > 0 && (
            <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-800">
              {totalInadimplentes} conta(s) inadimplente(s)
            </span>
          )}
          {totalEmTeste > 0 && (
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">
              {totalEmTeste} conta(s) em período de teste
            </span>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Assinaturas ativas por solução</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Solução</th>
                <th className="px-4 py-3">Ativas</th>
                <th className="px-4 py-3">Por plano</th>
                <th className="px-4 py-3">Em teste</th>
                <th className="px-4 py-3">Inadimplentes</th>
                <th className="px-4 py-3">Recorrente/mês</th>
                <th className="px-4 py-3">Custo de IA/mês</th>
                <th className="px-4 py-3">Margem estimada</th>
              </tr>
            </thead>
            <tbody>
              {assinaturas.map((a) => {
                const custoUsd = a.custoIa?.custoUsd ?? null;
                const temCustoParcial = custoUsd !== null && a.custoIa && a.custoIa.semPreco > 0;
                return (
                  <tr key={a.chave} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {a.rotulo}
                      {!a.temPlano && <span className="ml-1.5 text-xs font-normal text-slate-400">saldo pré-pago</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.ativas}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.porPlano.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="text-xs">
                          {a.porPlano.map((p) => `${p.nome}: ${p.assinantes}`).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.teste}</td>
                    <td className="px-4 py-3">
                      {a.inadimplentes > 0 ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          {a.inadimplentes}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.mensal > 0 ? moeda(a.mensal) : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {usd(custoUsd)}
                      {temCustoParcial && <span className="ml-1 text-xs text-amber-600">(parcial)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {custoUsd === null || a.mensal === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="text-xs">
                          {moeda(a.mensal)} − {usd(custoUsd)}*
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          O valor recorrente é calculado multiplicando as assinaturas ativas de cada solução pelo preço cadastrado
          naquela solução. Não é extrato do Asaas: descontos, atrasos e cobranças em aberto não estão refletidos
          aqui.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          * A margem mistura duas moedas de propósito (recorrente em real, custo de IA em dólar — a Anthropic e a
          OpenAI cobram em dólar, e converter aqui exigiria uma cotação que o sistema não guarda) e só desconta o
          custo de IA — hospedagem, consultas a terceiros, folha e demais custos operacionais não entram nessa
          conta. Serve para comparar ordem de grandeza, não como margem real do negócio. Para o detalhe por
          provedor de IA (Anthropic × OpenAI), veja{" "}
          <Link href="/admin/painel/custos" className="underline">
            Custos do sistema
          </Link>
          .
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Consultas a fontes externas</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">No mês</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Custo</th>
              </tr>
            </thead>
            <tbody>
              {consultas.map((c) => (
                <tr key={c.modelo} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.rotulo}</td>
                  <td className="px-4 py-3 text-slate-600">{c.mes}</td>
                  <td className="px-4 py-3 text-slate-600">{c.total}</td>
                  <td className="px-4 py-3 text-slate-400">não registrado</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {consultasNoMes} consulta(s) neste mês. O sistema conta quantas foram feitas, mas{" "}
          <span className="font-medium">não guarda quanto cada uma custou</span> — nenhum dos modelos de consulta tem
          campo de custo. Preferi mostrar isso em branco a estimar um valor: número de custo inventado vira decisão de
          preço errada. Para valorizar esta linha é preciso passar a gravar o custo unitário no momento da consulta.
        </p>
      </div>
    </div>
  );
}

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className="cartao">
      <p className="text-xs uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{valor}</p>
      <p className="mt-0.5 text-xs text-slate-400">{detalhe}</p>
    </div>
  );
}
