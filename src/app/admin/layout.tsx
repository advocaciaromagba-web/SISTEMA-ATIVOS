import { SessaoAdmin } from "@/components/sessao-admin";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** Tudo sob /admin usa a sessão própria da administração. */
export default function LayoutAdminRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoAdmin>{children}</SessaoAdmin>;
}
