import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessaoCompliance } from "@/lib/compliance/sessao";
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

export default async function Empresas() {
  const { conta } = await exigirSessaoCompliance();

  const empresas = await prisma.complianceEmpresa.findMany({
    where: { complianceContaId: conta.id, ativa: true },
    include: { _count: { select: { certidoes: true, documentos: true } } },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Empresas verificadas</h2>
          <p className="text-sm text-slate-500">Cada cadastro roda a auditoria automaticamente ao ser salvo.</p>
        </div>
        <Link href="/compliance/painel/empresas/nova" className="botao-principal">
          Nova empresa
        </Link>
      </div>

      {empresas.length === 0 ? (
        <div className="cartao text-center text-sm text-slate-500">Nenhuma empresa cadastrada ainda.</div>
      ) : (
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>CNPJ</th>
                <th>Certidões</th>
                <th>Relatórios</th>
                <th>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/compliance/painel/empresas/${e.id}`} className="font-medium text-slate-900 hover:underline">
                      {e.nome}
                    </Link>
                  </td>
                  <td className="text-slate-600">{formatarDocumento(e.documento) || "—"}</td>
                  <td className="text-slate-600">{e._count.certidoes}</td>
                  <td className="text-slate-600">{e._count.documentos}</td>
                  <td>
                    {e.situacaoCompliance ? (
                      <span className={`etiqueta ${CORES[e.situacaoCompliance] ?? "bg-slate-100 text-slate-700"}`}>
                        {ROTULOS[e.situacaoCompliance] ?? e.situacaoCompliance}
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
