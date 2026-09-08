import { SessaoAgro } from "@/components/sessao-agro";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** Tudo sob /agrojud usa a sessão própria desta solução. */
export default function LayoutAgroRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoAgro>{children}</SessaoAgro>;
}
