import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { prisma } from "@/lib/prisma";
import { SOLUCOES_ADMIN } from "@/lib/admin/solucoes";
import { BotaoResolver, FormularioPreco, FormularioRenovacao } from "./formularios";
import { CHAVE_RENOVACAO_IA, CHAVE_SALDO_IA } from "./chaves";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const dynamic = "force-dynamic";

const COR_GRAVIDADE: Record<string, string> = {
  CRITICO: "border-red-300 bg-red-50 text-red-900",
  ATENCAO: "border-amber-300 bg-amber-50 text-amber-900",
  INFORMATIVO: "border-slate-200 bg-slate-50 text-slate-700",
};

/**
 * Custo de IA por chamada é fração de centavo. Com duas casas, tudo vira
 * "US$ 0.00" e a tela passa a informação errada de que não se gastou nada —
 * então abaixo de um dólar mostramos quatro casas.
 */
function usd(v: number | null): string {
  if (v === null) return "—";
  if (v > 0 && v < 1) return `US$ ${v.toFixed(4)}`;
  return `US$ ${v.toFixed(2)}`;
}

function competencia(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export default async function CustosAdmin() {
  await exigirSessaoAdmin();

  const inicioDoMes = new Date();
  inicioDoMes.setDate(1);
  inicioDoMes.setHours(0, 0, 0, 0);

  const [alertas, precos, config, usosDoMes, totalChamadas, falhas] = await Promise.all([
    prisma.alertaSistema.findMany({ where: { resolvido: false }, orderBy: { criadoEm: "desc" } }),
    prisma.precoIa.findMany({ orderBy: { modelo: "asc" } }),
    prisma.configAdmin.findMany({ where: { chave: { in: [CHAVE_RENOVACAO_IA, CHAVE_SALDO_IA] } } }),
    prisma.usoIa.findMany({ where: { criadoEm: { gte: inicioDoMes } }, orderBy: { criadoEm: "desc" } }),
    prisma.usoIa.count(),
    prisma.usoIa.count({ where: { erro: { not: null }, criadoEm: { gte: inicioDoMes } } }),
  ]);

  const renovacao = config.find((c) => c.chave === CHAVE_RENOVACAO_IA)?.valor ?? "";
  const saldo = config.find((c) => c.chave === CHAVE_SALDO_IA)?.valor ?? "";

  const comSucesso = usosDoMes.filter((u) => !u.erro);
  const tokensEntrada = comSucesso.reduce((s, u) => s + u.tokensEntrada + u.tokensCacheCriacao + u.tokensCacheLeitura, 0);
  const tokensSaida = comSucesso.reduce((s, u) => s + u.tokensSaida, 0);
  const semPreco = comSucesso.filter((u) => u.custoUsd === null).length;
  const custoTotal = comSucesso.reduce((s, u) => s + (u.custoUsd === null ? 0 : Number(u.custoUsd)), 0);

  // Por solução
  const porSolucao = new Map<string, { chamadas: number; entrada: number; saida: number; custo: number; semPreco: number }>();
  for (const u of comSucesso) {
    const chave = u.solucao ?? "(sem solução informada)";
    const atual = porSolucao.get(chave) ?? { chamadas: 0, entrada: 0, saida: 0, custo: 0, semPreco: 0 };
    atual.chamadas += 1;
    atual.entrada += u.tokensEntrada + u.tokensCacheCriacao + u.tokensCacheLeitura;
    atual.saida += u.tokensSaida;
    if (u.custoUsd === null) atual.semPreco += 1;
    else atual.custo += Number(u.custoUsd);
    porSolucao.set(chave, atual);
  }

  const rotulo = (chave: string) => SOLUCOES_ADMIN.find((s) => s.chave === chave)?.rotulo ?? chave;

  // Dias até a renovação anotada
  let diasParaRenovar: number | null = null;
  if (renovacao) {
    const alvo = new Date(`${renovacao}T12:00:00-03:00`).getTime();
    const hoje = new Date(new Date().toISOString().slice(0, 10) + "T12:00:00-03:00").getTime();
    diasParaRenovar = Math.round((alvo - hoje) / 86_400_000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Custos do sistema</h1>
        <p className="mt-1 text-sm text-slate-500">
          Competência de {competencia(inicioDoMes)}. Os tokens são medidos na resposta da própria API — não são
          estimados.
        </p>
      </div>

      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a) => (
            <div key={a.id} className={`rounded-xl border px-4 py-3 text-sm ${COR_GRAVIDADE[a.gravidade] ?? COR_GRAVIDADE.INFORMATIVO}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {a.titulo}
                    {a.ocorrencias > 1 ? ` (${a.ocorrencias}×)` : ""}
                  </p>
                  <p className="mt-0.5">{a.detalhe}</p>
                </div>
                <BotaoResolver id={a.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {diasParaRenovar !== null && diasParaRenovar <= 15 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-semibold">
            {diasParaRenovar < 0
              ? `A renovação anotada venceu há ${-diasParaRenovar} dia(s).`
              : `Faltam ${diasParaRenovar} dia(s) para a renovação anotada do crédito de IA.`}
          </span>{" "}
          Se o crédito acabar, a leitura de documentos por IA para de funcionar em todas as soluções.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo="Chamadas no mês" valor={String(comSucesso.length)} detalhe={`${totalChamadas} desde o início`} />
        <Numero rotulo="Tokens de entrada" valor={tokensEntrada.toLocaleString("pt-BR")} detalhe="inclui cache" />
        <Numero rotulo="Tokens de saída" valor={tokensSaida.toLocaleString("pt-BR")} detalhe="no mês" />
        <Numero
          rotulo="Custo no mês"
          valor={semPreco === comSucesso.length && comSucesso.length > 0 ? "não calculado" : usd(custoTotal)}
          detalhe={semPreco > 0 ? `${semPreco} chamada(s) sem preço informado` : "com o preço informado"}
        />
      </div>

      {falhas > 0 && (
        <p className="text-sm text-amber-800">
          {falhas} chamada(s) falharam neste mês. Falhas também ficam registradas — é por elas que se percebe crédito
          acabado ou chave revogada.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Solução</th>
              <th className="px-4 py-3">Chamadas</th>
              <th className="px-4 py-3">Tokens entrada</th>
              <th className="px-4 py-3">Tokens saída</th>
              <th className="px-4 py-3">Custo</th>
            </tr>
          </thead>
          <tbody>
            {porSolucao.size === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Nenhuma chamada à IA neste mês.
                </td>
              </tr>
            )}
            {[...porSolucao.entries()].map(([chave, v]) => (
              <tr key={chave} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{rotulo(chave)}</td>
                <td className="px-4 py-3 text-slate-600">{v.chamadas}</td>
                <td className="px-4 py-3 text-slate-600">{v.entrada.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3 text-slate-600">{v.saida.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3 text-slate-600">
                  {v.semPreco === v.chamadas ? <span className="text-slate-400">falta o preço</span> : usd(v.custo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormularioRenovacao renovacao={renovacao} saldo={saldo} />

      <FormularioPreco
        modelos={precos.map((p) => ({
          modelo: p.modelo,
          entrada: Number(p.usdPorMilhaoEntrada).toFixed(2),
          saida: Number(p.usdPorMilhaoSaida).toFixed(2),
          fonte: p.fonte,
          atualizadoEm: new Date(p.atualizadoEm).toLocaleDateString("pt-BR"),
        }))}
      />
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
