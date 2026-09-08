import { SessaoSerasa } from "@/components/sessao-serasa";

/** Tudo sob /serasa usa a sessão própria desta solução. */
export default function LayoutSerasaRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoSerasa>{children}</SessaoSerasa>;
}
