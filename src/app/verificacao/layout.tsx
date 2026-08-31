import { SessaoVerificacao } from "@/components/sessao-verificacao";

/** Tudo sob /verificacao usa a sessão própria desta solução. */
export default function LayoutVerificacaoRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoVerificacao>{children}</SessaoVerificacao>;
}
