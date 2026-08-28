import { prisma } from "@/lib/prisma";
import { exigirSessaoSerasa } from "@/lib/serasa/sessao";
import { formatarDocumento } from "@/lib/validacao";
import { dataCurta } from "@/lib/formato";
import { serasaConfigurado } from "@/lib/serasa/fonte";
import { FormularioNovaConsulta } from "./formulario";

export const dynamic = "force-dynamic";

const ROTULO_SITUACAO: Record<string, string> = {
  EM_ANDAMENTO: "em andamento",
  CONCLUIDA: "concluída",
  ERRO: "erro",
  INDISPONIVEL: "não disponível",
};
const COR_SITUACAO: Record<string, string> = {
  EM_ANDAMENTO: "bg-amber-100 text-amber-800",
  CONCLUIDA: "bg-emerald-100 text-emerald-800",
  ERRO: "bg-red-100 text-red-800",
  INDISPONIVEL: "bg-slate-200 text-slate-700",
};

export default async function Consultas() {
  const { conta } = await exigirSessaoSerasa();

  const consultas = await prisma.serasaConsulta.findMany({
    where: { serasaContaId: conta.id },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Consulta cadastral</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Situação, restrições e composição cadastral de uma pessoa ou empresa, pela base do SERASA.
        </p>
      </div>

      {!serasaConfigurado() && (
        <div className="aviso-atencao">
          <strong className="block">Fonte ainda não configurada</strong>
          <span className="mt-1 block">
            A integração com o SERASA está prevista, mas ainda não foi ligada. Você já pode pedir consultas — elas
            ficam registradas aqui, sem custo nenhum, e são respondidas assim que a fonte estiver pronta.
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="cartao lg:col-span-1">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Nova consulta</h2>
          <FormularioNovaConsulta />
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Histórico</h2>
          {consultas.length === 0 ? (
            <div className="cartao text-center text-sm text-slate-500">Nenhuma consulta ainda.</div>
          ) : (
            <div className="cartao overflow-x-auto p-0">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Situação</th>
                    <th>Pedida em</th>
                    <th className="text-right">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {consultas.map((c) => (
                    <tr key={c.id}>
                      <td className="text-slate-700">
                        {formatarDocumento(c.documento) || c.documento}
                        {c.nomeInformado && <div className="text-xs text-slate-400">{c.nomeInformado}</div>}
                      </td>
                      <td>
                        <span className={`etiqueta ${COR_SITUACAO[c.situacao] ?? "bg-slate-100 text-slate-600"}`}>
                          {ROTULO_SITUACAO[c.situacao] ?? c.situacao}
                        </span>
                        {c.erro && <div className="mt-1 max-w-xs text-xs text-slate-500">{c.erro}</div>}
                      </td>
                      <td className="text-slate-500">{dataCurta(c.criadoEm)}</td>
                      <td className="text-right text-slate-700">
                        {Number(c.creditoDebitado) > 0
                          ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                              Number(c.creditoDebitado)
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
