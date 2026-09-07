import { acessoAdminEmCurso } from "@/lib/admin/acesso";

/**
 * Tarja que aparece em todo o site enquanto um administrador está dentro da
 * conta de um cliente.
 *
 * Fica no layout raiz de propósito: se dependesse de cada solução lembrar de
 * incluí-la, a primeira solução esquecida seria justamente onde o acesso
 * ficaria invisível.
 */
export async function TarjaAcessoAdmin() {
  const acesso = await acessoAdminEmCurso();
  if (!acesso) return null;

  return (
    <div className="sticky top-0 z-50 border-b border-red-700 bg-red-600 px-4 py-2 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          <span className="font-semibold">Acesso administrativo.</span> {acesso.administradorNome} está vendo a conta{" "}
          <span className="font-semibold">{acesso.contaNome}</span>. Este acesso está registrado.
        </p>
        <a
          href="/admin/encerrar-acesso"
          className="rounded-lg bg-white/15 px-3 py-1 font-medium text-white underline-offset-2 hover:bg-white/25"
        >
          Encerrar acesso
        </a>
      </div>
    </div>
  );
}
