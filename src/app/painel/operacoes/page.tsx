import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { FASES, TIPOS_ATIVO } from "@/lib/documentos/catalogo";
import { moeda } from "@/lib/formato";

export const dynamic = "force-dynamic";

const CORES_FASE: Record<string, string> = {
  PROSPECCAO: "bg-slate-100 text-slate-700",
  NDA: "bg-sky-100 text-sky-800",
  DUE_DILIGENCE: "bg-indigo-100 text-indigo-800",
  PROPOSTA: "bg-violet-100 text-violet-800",
  CONTRATO: "bg-amber-100 text-amber-800",
  LIQUIDACAO: "bg-teal-100 text-teal-800",
  CONCLUIDA: "bg-emerald-100 text-emerald-800",
  CANCELADA: "bg-red-100 text-red-800",
};

export default async function Operacoes({ searchParams }: { searchParams: { fase?: string } }) {
  const { organizacao } = await exigirSessao();
  const fase = searchParams.fase;

  const operacoes = await prisma.operacao.findMany({
    where: { organizacaoId: organizacao.id, ...(fase ? { fase } : {}) },
    include: { _count: { select: { partes: true, documentos: true } } },
    orderBy: { criadoEm: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Operações</h1>
          <p className="text-sm text-slate-500">Cada negócio que você está intermediando.</p>
        </div>
        <Link href="/painel/operacoes/nova" className="botao-principal">
          Nova operação
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/painel/operacoes"
          className={`etiqueta ${!fase ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Todas
        </Link>
        {Object.entries(FASES).map(([chave, rotulo]) => (
          <Link
            key={chave}
            href={`/painel/operacoes?fase=${chave}`}
            className={`etiqueta ${fase === chave ? "bg-slate-800 text-white" : CORES_FASE[chave]}`}
          >
            {rotulo}
          </Link>
        ))}
      </div>

      {operacoes.length === 0 ? (
        <div className="cartao text-center text-sm text-slate-500">Nenhuma operação nesta situação.</div>
      ) : (
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Operação</th>
                <th>Ativo</th>
                <th className="text-right">Valor negociado</th>
                <th>Partes</th>
                <th>Documentos</th>
                <th>Fase</th>
              </tr>
            </thead>
            <tbody>
              {operacoes.map((o) => (
                <tr key={o.id}>
                  <td className="font-mono text-xs text-slate-500">{o.codigo}</td>
                  <td>
                    <Link href={`/painel/operacoes/${o.id}`} className="font-medium text-slate-900 hover:underline">
                      {o.titulo}
                    </Link>
                  </td>
                  <td className="text-slate-600">{TIPOS_ATIVO[o.tipoAtivo] ?? o.tipoAtivo}</td>
                  <td className="text-right text-slate-700">
                    {o.valorNegociado != null ? moeda(Number(o.valorNegociado), o.moeda) : "—"}
                  </td>
                  <td className="text-slate-600">{o._count.partes}</td>
                  <td className="text-slate-600">{o._count.documentos}</td>
                  <td>
                    <span className={`etiqueta ${CORES_FASE[o.fase] ?? "bg-slate-100 text-slate-600"}`}>
                      {FASES[o.fase] ?? o.fase}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
