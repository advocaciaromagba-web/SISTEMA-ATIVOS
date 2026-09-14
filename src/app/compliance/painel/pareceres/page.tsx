import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessaoCompliance } from "@/lib/compliance/sessao";
import { dataCurta } from "@/lib/formato";
import { ROTULO_TIPO_PARECER } from "@/lib/compliance/parecer";

export const dynamic = "force-dynamic";

const ROTULO_SITUACAO: Record<string, string> = {
  GERANDO_MINUTA: "gerando minuta",
  MINUTA_PRONTA: "minuta pronta",
  FINALIZADO: "finalizado",
  ERRO: "erro",
};
const COR_SITUACAO: Record<string, string> = {
  GERANDO_MINUTA: "bg-slate-100 text-slate-600",
  MINUTA_PRONTA: "bg-amber-100 text-amber-800",
  FINALIZADO: "bg-emerald-100 text-emerald-800",
  ERRO: "bg-red-100 text-red-800",
};

export default async function Pareceres() {
  const { conta } = await exigirSessaoCompliance();

  const pareceres = await prisma.complianceParecer.findMany({
    where: { complianceContaId: conta.id },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Pareceres</h2>
          <p className="text-sm text-slate-500">
            Contrato, documento, parecer existente ou um processo já cadastrado — sobre qualquer tema, em texto
            livre. Minuta gerada automaticamente; parecer final só depois da sua revisão.
          </p>
        </div>
        <Link href="/compliance/painel/pareceres/nova" className="botao-principal">
          Novo parecer
        </Link>
      </div>

      {pareceres.length === 0 ? (
        <div className="cartao text-center text-sm text-slate-500">Nenhum parecer pedido ainda.</div>
      ) : (
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Tema</th>
                <th>Tipo</th>
                <th>Situação</th>
                <th>Pedido em</th>
              </tr>
            </thead>
            <tbody>
              {pareceres.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/compliance/painel/pareceres/${p.id}`} className="font-medium text-slate-900 hover:underline">
                      {p.tema.length > 80 ? `${p.tema.slice(0, 80)}…` : p.tema}
                    </Link>
                  </td>
                  <td className="text-slate-600">{ROTULO_TIPO_PARECER[p.tipo] ?? p.tipo}</td>
                  <td>
                    <span className={`etiqueta ${COR_SITUACAO[p.situacao] ?? "bg-slate-100 text-slate-700"}`}>
                      {ROTULO_SITUACAO[p.situacao] ?? p.situacao}
                    </span>
                  </td>
                  <td className="text-slate-600">{dataCurta(p.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
