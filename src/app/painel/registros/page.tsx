import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { dataHora } from "@/lib/formato";

export const dynamic = "force-dynamic";

const ROTULOS: Record<string, string> = {
  LOGIN: "Entrou no sistema",
  LOGIN_FALHA: "Tentativa de login recusada",
  LOGOUT: "Saiu do sistema",
  CRIAR: "Criou",
  EDITAR: "Alterou",
  EXCLUIR: "Excluiu",
  GERAR_DOCUMENTO: "Gerou documento",
  BAIXAR_DOCUMENTO: "Baixou documento",
  ENVIAR_ASSINATURA: "Enviou para assinatura",
  CONSULTAR: "Consultou",
  EXPORTAR: "Exportou dados",
};

const CORES: Record<string, string> = {
  LOGIN_FALHA: "bg-red-100 text-red-800",
  EXCLUIR: "bg-red-100 text-red-800",
  GERAR_DOCUMENTO: "bg-sky-100 text-sky-800",
  BAIXAR_DOCUMENTO: "bg-slate-100 text-slate-700",
  ENVIAR_ASSINATURA: "bg-amber-100 text-amber-800",
};

export default async function Auditoria({ searchParams }: { searchParams: { pagina?: string } }) {
  const { organizacao } = await exigirSessao();

  const pagina = Math.max(1, Number(searchParams.pagina ?? 1));
  const porPagina = 50;

  const [registros, total] = await Promise.all([
    prisma.logAuditoria.findMany({
      where: { organizacaoId: organizacao.id },
      include: { usuario: { select: { nome: true } } },
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.logAuditoria.count({ where: { organizacaoId: organizacao.id } }),
  ]);

  const paginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Auditoria</h1>
        <p className="text-sm text-slate-500">
          Quem fez o quê, quando e de onde. Este registro não é editado nem apagado pelo sistema.
        </p>
      </div>

      {registros.length === 0 ? (
        <div className="cartao text-center text-sm text-slate-500">Nenhum registro ainda.</div>
      ) : (
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Quem</th>
                <th>Ação</th>
                <th>Sobre</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-slate-600">{dataHora(r.criadoEm)}</td>
                  <td className="text-slate-700">{r.usuario?.nome ?? "—"}</td>
                  <td>
                    <span className={`etiqueta ${CORES[r.acao] ?? "bg-slate-100 text-slate-700"}`}>
                      {ROTULOS[r.acao] ?? r.acao}
                    </span>
                  </td>
                  <td className="text-slate-600">
                    {r.entidade ?? "—"}
                    {r.detalhe != null && (
                      <div className="max-w-md truncate text-xs text-slate-400">{resumir(r.detalhe)}</div>
                    )}
                  </td>
                  <td className="font-mono text-xs text-slate-400">{r.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paginas > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Página {pagina} de {paginas} · {total} registros
          </span>
          <div className="flex gap-2">
            {pagina > 1 && (
              <a href={`/painel/registros?pagina=${pagina - 1}`} className="botao-secundario">
                Anterior
              </a>
            )}
            {pagina < paginas && (
              <a href={`/painel/registros?pagina=${pagina + 1}`} className="botao-secundario">
                Próxima
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Transforma o detalhe em JSON numa linha legível. */
function resumir(detalhe: unknown): string {
  if (detalhe == null || typeof detalhe !== "object") return "";
  return Object.entries(detalhe as Record<string, unknown>)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}
