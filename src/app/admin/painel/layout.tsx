import Link from "next/link";
import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { BarraAdmin } from "./barra";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function LayoutPainelAdmin({ children }: { children: React.ReactNode }) {
  const admin = await exigirSessaoAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <BarraAdmin nome={admin.nome} email={admin.email} />

      {/* Conta com acesso a tudo e uma senha só é uma senha entre o mundo e os
          dados de todos os clientes. O aviso fica até o segundo fator existir. */}
      {!admin.totpAtivado && (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2.5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-sm text-amber-900">
            <p>
              <span className="font-semibold">Verificação em duas etapas desligada.</span> Esta conta enxerga os dados de
              todos os clientes; hoje só uma senha separa o mundo deles.
            </p>
            <Link href="/admin/painel/seguranca" className="font-medium underline">
              Ativar agora
            </Link>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
