import Link from "next/link";
import { exigirSessaoAgro } from "@/lib/agro/sessao";
import { prisma } from "@/lib/prisma";
import { moeda } from "@/lib/formato";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const dynamic = "force-dynamic";

const ROTULO_MODALIDADE: Record<string, string> = {
  GERAL: "Modalidade geral",
  FAVORECIDA: "Modalidade favorecida",
};

export default async function ContratosAgro() {
  const { conta } = await exigirSessaoAgro();

  const contratos = await prisma.agroContrato.findMany({
    where: { agroContaId: conta.id },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Contratos</h1>
          <p className="mt-1 text-sm text-slate-500">Análise de enquadramento como crédito rural e na MP 1.376/2026.</p>
        </div>
        <Link href="/agrojud/painel/contratos/novo" className="botao-principal">
          Novo contrato
        </Link>
      </div>

      {contratos.length === 0 ? (
        <div className="cartao text-sm text-slate-500">Nenhum contrato analisado ainda.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Contrato</th>
                <th className="px-4 py-3">Mutuário</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Enquadra MP 1.376</th>
                <th className="px-4 py-3">Modalidade</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => {
                const resultado = c.resultadoMp1376 as { enquadraNaMP1376?: boolean | "INDETERMINADO"; modalidade?: string | null } | null;
                const enquadra = resultado?.enquadraNaMP1376;
                return (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{c.titulo}</td>
                    <td className="px-4 py-3 text-slate-600">{c.mutuarioNome ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{c.valorOperacao ? moeda(Number(c.valorOperacao)) : "—"}</td>
                    <td className="px-4 py-3">
                      {enquadra === true && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Atende</span>}
                      {enquadra === false && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Não atende</span>}
                      {(enquadra === "INDETERMINADO" || enquadra === undefined) && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Faltam dados</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{resultado?.modalidade ? ROTULO_MODALIDADE[resultado.modalidade] : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/agrojud/painel/contratos/${c.id}`} className="text-sm font-medium underline">
                        Ver parecer
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
