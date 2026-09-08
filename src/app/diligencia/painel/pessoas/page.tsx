import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessaoDiligencia } from "@/lib/diligencia/sessao";
import { formatarDocumento } from "@/lib/validacao";

export const dynamic = "force-dynamic";

const ROTULOS: Record<string, string> = {
  SEM_APONTAMENTO: "sem apontamentos",
  ATENCAO: "atenção",
  RESTRICAO: "restrição",
};
const CORES: Record<string, string> = {
  SEM_APONTAMENTO: "bg-emerald-100 text-emerald-800",
  ATENCAO: "bg-amber-100 text-amber-800",
  RESTRICAO: "bg-red-100 text-red-800",
};

export default async function Pessoas() {
  const { conta } = await exigirSessaoDiligencia();

  const pessoas = await prisma.diligenciaPessoa.findMany({
    where: { diligenciaContaId: conta.id, ativa: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Pessoas verificadas</h2>
          <p className="text-sm text-slate-500">Cada cadastro roda a auditoria automaticamente ao ser salvo.</p>
        </div>
        <Link href="/diligencia/painel/pessoas/nova" className="botao-principal">
          Nova pessoa
        </Link>
      </div>

      {pessoas.length === 0 ? (
        <div className="cartao text-center text-sm text-slate-500">Nenhuma pessoa cadastrada ainda.</div>
      ) : (
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>CPF</th>
                <th>UF</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {pessoas.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/diligencia/painel/pessoas/${p.id}`} className="font-medium text-slate-900 hover:underline">
                      {p.nome}
                    </Link>
                  </td>
                  <td className="text-slate-600">{formatarDocumento(p.documento) || "—"}</td>
                  <td className="text-slate-600">{p.uf || "—"}</td>
                  <td>
                    {p.situacaoCompliance ? (
                      <span className={`etiqueta ${CORES[p.situacaoCompliance] ?? "bg-slate-100 text-slate-700"}`}>
                        {ROTULOS[p.situacaoCompliance] ?? p.situacaoCompliance}
                      </span>
                    ) : (
                      <span className="etiqueta bg-slate-100 text-slate-600">não auditada</span>
                    )}
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
