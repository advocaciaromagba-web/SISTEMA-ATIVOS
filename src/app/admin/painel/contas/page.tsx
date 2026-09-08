import Link from "next/link";
import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { listarTodasAsContas, SOLUCOES_ADMIN } from "@/lib/admin/solucoes";

export const dynamic = "force-dynamic";

function data(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("pt-BR") : "—";
}

export default async function ContasAdmin(
  props: {
    searchParams: Promise<{ solucao?: string; busca?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  await exigirSessaoAdmin();

  const busca = (searchParams.busca ?? "").trim();
  const filtroSolucao = searchParams.solucao ?? "";

  const todas = await listarTodasAsContas({ busca });
  const contas = filtroSolucao ? todas.filter((c) => c.solucao === filtroSolucao) : todas;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Contas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Todas as contas das sete soluções. Cada solução continua com a tabela dela — esta tela lê uma por uma, não
          existe cadastro compartilhado por trás.
        </p>
      </div>

      <form className="cartao flex flex-wrap items-end gap-3" method="get">
        <div className="min-w-[220px] flex-1">
          <label className="rotulo" htmlFor="busca">
            Buscar por nome ou e-mail
          </label>
          <input id="busca" name="busca" defaultValue={busca} className="campo" placeholder="parte do nome ou do e-mail" />
        </div>
        <div>
          <label className="rotulo" htmlFor="solucao">
            Solução
          </label>
          <select id="solucao" name="solucao" defaultValue={filtroSolucao} className="campo">
            <option value="">Todas</option>
            {SOLUCOES_ADMIN.map((s) => (
              <option key={s.chave} value={s.chave}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="botao-principal">
          Filtrar
        </button>
        {(busca || filtroSolucao) && (
          <Link href="/admin/painel/contas" className="text-sm underline">
            Limpar
          </Link>
        )}
      </form>

      <p className="text-sm text-slate-500">
        {contas.length} conta(s){busca ? ` para “${busca}”` : ""}. Cada solução traz no máximo as 200 mais recentes.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Conta</th>
              <th className="px-4 py-3">Solução</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Assinatura</th>
              <th className="px-4 py-3">Criada em</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {contas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Nenhuma conta encontrada.
                </td>
              </tr>
            )}
            {contas.map((c) => (
              <tr key={`${c.solucao}-${c.id}`} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{c.nome}</p>
                  <p className="text-xs text-slate-500">{c.emailContato ?? "sem e-mail de contato"}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.solucaoRotulo}</td>
                <td className="px-4 py-3 text-slate-600">{c.plano ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c.statusAssinatura ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{data(c.criadoEm)}</td>
                <td className="px-4 py-3">
                  {c.bloqueadoEm ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      Bloqueada
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      Ativa
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/painel/contas/${c.solucao}/${c.id}`} className="text-sm font-medium underline">
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
