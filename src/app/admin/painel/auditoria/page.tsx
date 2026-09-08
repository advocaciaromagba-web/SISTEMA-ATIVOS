import Link from "next/link";
import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { prisma } from "@/lib/prisma";
import { SOLUCOES_ADMIN } from "@/lib/admin/solucoes";

export const dynamic = "force-dynamic";

const POR_PAGINA = 100;

const COR_ACAO: Record<string, string> = {
  LOGIN: "bg-slate-100 text-slate-700",
  LOGIN_FALHA: "bg-amber-100 text-amber-800",
  SAIR: "bg-slate-100 text-slate-700",
  VER: "bg-slate-100 text-slate-600",
  CRIAR: "bg-emerald-100 text-emerald-700",
  EDITAR: "bg-sky-100 text-sky-700",
  BLOQUEAR: "bg-amber-100 text-amber-800",
  DESBLOQUEAR: "bg-emerald-100 text-emerald-700",
  EXCLUIR_DEFINITIVO: "bg-red-100 text-red-700",
  EXPORTAR: "bg-sky-100 text-sky-700",
  ACESSAR_COMO: "bg-red-100 text-red-700",
  ENCERRAR_ACESSO: "bg-slate-100 text-slate-700",
  CONFIGURAR: "bg-sky-100 text-sky-700",
};

function quando(d: Date): string {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

export default async function AuditoriaAdmin(
  props: {
    searchParams: Promise<{ acao?: string; solucao?: string; pagina?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  await exigirSessaoAdmin();

  const pagina = Math.max(1, Number(searchParams.pagina ?? "1") || 1);
  const filtro: Record<string, unknown> = {};
  if (searchParams.acao) filtro.acao = searchParams.acao;
  if (searchParams.solucao) filtro.solucao = searchParams.solucao;

  const [registros, total, abertos] = await Promise.all([
    prisma.adminAuditoria.findMany({
      where: filtro,
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.adminAuditoria.count({ where: filtro }),
    prisma.adminAcesso.findMany({
      where: { encerradoEm: null },
      orderBy: { iniciadoEm: "desc" },
      include: { administrador: { select: { nome: true } } },
    }),
  ]);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Auditoria</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tudo o que a administração fez. O sistema só escreve aqui — não existe editar nem apagar, nem para quem tem
          acesso total.
        </p>
      </div>

      {abertos.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-900">Acessos a conta de cliente ainda abertos</p>
          <ul className="mt-2 space-y-1 text-sm text-red-900">
            {abertos.map((a) => (
              <li key={a.id}>
                {a.administrador.nome} está em <span className="font-medium">{a.contaNome}</span> desde{" "}
                {quando(a.iniciadoEm)}
                {a.motivo ? ` — ${a.motivo}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="cartao flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="rotulo" htmlFor="acao">
            Ação
          </label>
          <select id="acao" name="acao" defaultValue={searchParams.acao ?? ""} className="campo">
            <option value="">Todas</option>
            {Object.keys(COR_ACAO).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor="solucao">
            Solução
          </label>
          <select id="solucao" name="solucao" defaultValue={searchParams.solucao ?? ""} className="campo">
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
        {(searchParams.acao || searchParams.solucao) && (
          <Link href="/admin/painel/auditoria" className="text-sm underline">
            Limpar
          </Link>
        )}
      </form>

      <p className="text-sm text-slate-500">
        {total} registro(s) · página {pagina} de {paginas}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Quando</th>
              <th className="px-4 py-3">Quem</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">O que aconteceu</th>
              <th className="px-4 py-3">Origem</th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Nenhum registro.
                </td>
              </tr>
            )}
            {registros.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{quando(r.criadoEm)}</td>
                <td className="px-4 py-3">
                  <p className="text-slate-900">{r.administradorNome}</p>
                  <p className="text-xs text-slate-500">{r.administradorEmail}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COR_ACAO[r.acao] ?? "bg-slate-100 text-slate-700"}`}>
                    {r.acao}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{r.resumo}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{r.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-between text-sm">
          {pagina > 1 ? (
            <Link href={{ pathname: "/admin/painel/auditoria", query: { ...searchParams, pagina: pagina - 1 } }} className="underline">
              ← Anteriores
            </Link>
          ) : (
            <span />
          )}
          {pagina < paginas && (
            <Link href={{ pathname: "/admin/painel/auditoria", query: { ...searchParams, pagina: pagina + 1 } }} className="underline">
              Próximas →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
