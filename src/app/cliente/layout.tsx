import { SessaoCliente } from "@/components/sessao-cliente";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** Tudo sob /cliente usa a sessão própria do Cliente. */
export default function LayoutClienteRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoCliente>{children}</SessaoCliente>;
}
