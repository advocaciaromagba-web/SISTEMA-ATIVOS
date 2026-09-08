import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";

export const dynamic = "force-dynamic";

const ROTULO_FASE: Record<string, string> = {
  ANALISE: "Em análise",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export default async function Prefeituras() {
  const { conta } = await exigirSessaoLicitacoes();

  const certames = await prisma.certame.findMany({
    where: { licitacaoContaId: conta.id },
    include: { _count: { select: { participantes: true } } },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Certames</h2>
          <p className="text-sm text-slate-500">
            Cadastro próprio desta frente: os participantes aqui são o que foi apresentado ao órgão, não o cadastro
            do licitante.
          </p>
        </div>
        <Link href="/licitacoes/painel/prefeituras/nova" className="botao-principal">
          Novo certame
        </Link>
      </div>

      {certames.length === 0 ? (
        <div className="cartao text-center text-sm text-slate-500">Nenhum certame cadastrado ainda.</div>
      ) : (
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Certame</th>
                <th>Órgão</th>
                <th>Participantes</th>
                <th>Fase</th>
              </tr>
            </thead>
            <tbody>
              {certames.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      href={`/licitacoes/painel/prefeituras/${c.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {c.modalidade} nº {c.numeroCertame}
                    </Link>
                  </td>
                  <td className="text-slate-600">{c.orgaoLicitante}</td>
                  <td className="text-slate-600">{c._count.participantes}</td>
                  <td>
                    <span className="etiqueta bg-slate-100 text-slate-700">{ROTULO_FASE[c.fase] ?? c.fase}</span>
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
