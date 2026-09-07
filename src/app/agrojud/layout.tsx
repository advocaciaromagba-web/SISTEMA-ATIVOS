import { SessaoAgro } from "@/components/sessao-agro";

/** Tudo sob /agrojud usa a sessão própria desta solução. */
export default function LayoutAgroRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoAgro>{children}</SessaoAgro>;
}
