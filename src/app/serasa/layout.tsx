import { SessaoSerasa } from "@/components/sessao-serasa";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** Tudo sob /serasa usa a sessão própria desta solução. */
export default function LayoutSerasaRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoSerasa>{children}</SessaoSerasa>;
}
