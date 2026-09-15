import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { dataCurta } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function EditaisDeInteresse() {
  const { conta } = await exigirSessaoLicitacoes();

  const editais = await prisma.editalInteresse.findMany({
    where: { licitacaoContaId: conta.id },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/licitacoes/painel/licitantes" className="text-sm text-slate-500 hover:underline">
          ← Empresas licitantes
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Editais de interesse</h1>
        <p className="text-sm text-slate-500">
          Cadastrados manualmente ou salvos da busca no PNCP. Quando há PDF anexado, a leitura automática já extrai
          os requisitos de habilitação.
        </p>
      </div>

      {editais.length === 0 ? (
        <div className="cartao text-center text-sm text-slate-500">Nenhum edital cadastrado ainda.</div>
      ) : (
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Órgão</th>
                <th>Modalidade / número</th>
                <th>Leitura automática</th>
                <th>Cadastrado em</th>
              </tr>
            </thead>
            <tbody>
              {editais.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/licitacoes/painel/licitantes/editais/${e.id}`} className="font-medium text-slate-900 hover:underline">
                      {e.orgaoLicitante}
                    </Link>
                  </td>
                  <td className="text-slate-600">
                    {e.modalidade} nº {e.numeroCertame}
                  </td>
                  <td>
                    {e.leituraIaErro ? (
                      <span className="etiqueta bg-red-100 text-red-800">erro</span>
                    ) : e.leituraIaEm ? (
                      <span className="etiqueta bg-emerald-100 text-emerald-800">lido</span>
                    ) : e.arquivo ? (
                      <span className="etiqueta bg-slate-100 text-slate-600">não lido</span>
                    ) : (
                      <span className="etiqueta bg-slate-100 text-slate-600">sem arquivo</span>
                    )}
                  </td>
                  <td className="text-slate-600">{dataCurta(e.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
