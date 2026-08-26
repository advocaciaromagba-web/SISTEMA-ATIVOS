import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { formatarDocumento } from "@/lib/validacao";
import { FormularioParticipante } from "./participante-form";

export const dynamic = "force-dynamic";

const ROTULO_SITUACAO: Record<string, string> = {
  EM_ANALISE: "Em análise",
  QUALIFICADO: "Qualificado",
  INABILITADO: "Inabilitado",
};
const COR_SITUACAO: Record<string, string> = {
  EM_ANALISE: "bg-slate-100 text-slate-700",
  QUALIFICADO: "bg-emerald-100 text-emerald-800",
  INABILITADO: "bg-red-100 text-red-800",
};

export default async function DetalheCertame({ params }: { params: { id: string } }) {
  const { organizacao } = await exigirSessao();

  const certame = await prisma.certame.findFirst({
    where: { id: params.id, organizacaoId: organizacao.id },
    include: {
      participantes: { orderBy: { criadoEm: "asc" }, include: { _count: { select: { documentos: true } } } },
    },
  });
  if (!certame) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/painel/licitacoes/prefeituras" className="text-sm text-slate-500 hover:underline">
          ← Certames
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {certame.modalidade} nº {certame.numeroCertame}
        </h1>
        <p className="text-sm text-slate-500">
          {certame.orgaoLicitante}
          {certame.objeto ? ` — ${certame.objeto}` : ""}
        </p>
      </div>

      <section className="cartao">
        <h2 className="mb-1 text-base font-semibold">Participantes</h2>
        <p className="mb-4 text-sm text-slate-500">
          A documentação de cada um é conferida quanto à autenticidade e à assinatura antes da qualificação final.
        </p>

        {certame.participantes.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>CNPJ</th>
                  <th>Documentos</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {certame.participantes.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/painel/licitacoes/prefeituras/${certame.id}/${p.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {p.nome}
                      </Link>
                    </td>
                    <td className="text-slate-600">{formatarDocumento(p.documento) || "—"}</td>
                    <td className="text-slate-600">{p._count.documentos}</td>
                    <td>
                      <span className={`etiqueta ${COR_SITUACAO[p.situacao] ?? "bg-slate-100 text-slate-700"}`}>
                        {ROTULO_SITUACAO[p.situacao] ?? p.situacao}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <FormularioParticipante certameId={certame.id} />
      </section>
    </div>
  );
}
