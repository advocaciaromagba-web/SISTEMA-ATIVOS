import { SessaoCompliance } from "@/components/sessao-compliance";

/** Tudo sob /compliance usa a sessão própria desta solução. */
export default function LayoutComplianceRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoCompliance>{children}</SessaoCompliance>;
}
