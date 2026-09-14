import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessaoCompliance } from "@/lib/compliance/sessao";
import { formatarNumeroProcessoCnj } from "@/lib/validacao";

export const dynamic = "force-dynamic";

const ROTULOS: Record<string, string> = {
  REGULAR: "regular",
  ATENCAO: "atenção",
  IRREGULAR: "irregular",
};
const CORES: Record<string, string> = {
  REGULAR: "bg-emerald-100 text-emerald-800",
  ATENCAO: "bg-amber-100 text-amber-800",
  IRREGULAR: "bg-red-100 text-red-800",
};

export default async function Processos() {
  const { conta } = await exigirSessaoCompliance();

  const processos = await prisma.complianceProcesso.findMany({
    where: { complianceContaId: conta.id, ativa: true },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Análise processual de precatórios</h2>
          <p className="text-sm text-slate-500">
            Regularidade do processo de origem — sessões, recursos, trânsito em julgado, homologação de cálculos,
            decisões conflitantes e pendências. Roda automaticamente ao ser salvo.
          </p>
        </div>
        <Link href="/compliance/painel/processos/nova" className="botao-principal">
          Novo processo
        </Link>
      </div>

      {processos.length === 0 ? (
        <div className="cartao text-center text-sm text-slate-500">Nenhum processo cadastrado ainda.</div>
      ) : (
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Referência</th>
                <th>Número do processo</th>
                <th>Fase</th>
                <th>Regularidade</th>
              </tr>
            </thead>
            <tbody>
              {processos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      href={`/compliance/painel/processos/${p.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {p.apelido || formatarNumeroProcessoCnj(p.numeroProcesso)}
                    </Link>
                  </td>
                  <td className="text-slate-600">{formatarNumeroProcessoCnj(p.numeroProcesso)}</td>
                  <td className="text-slate-600">{p.faseAtual || "—"}</td>
                  <td>
                    {p.situacaoRegularidade ? (
                      <span className={`etiqueta ${CORES[p.situacaoRegularidade] ?? "bg-slate-100 text-slate-700"}`}>
                        {ROTULOS[p.situacaoRegularidade] ?? p.situacaoRegularidade}
                      </span>
                    ) : (
                      <span className="etiqueta bg-slate-100 text-slate-600">não analisado</span>
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
