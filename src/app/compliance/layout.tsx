import { SessaoCompliance } from "@/components/sessao-compliance";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** Tudo sob /compliance usa a sessão própria desta solução. */
export default function LayoutComplianceRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoCompliance>{children}</SessaoCompliance>;
}
