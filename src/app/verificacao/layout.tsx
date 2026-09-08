import { SessaoVerificacao } from "@/components/sessao-verificacao";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** Tudo sob /verificacao usa a sessão própria desta solução. */
export default function LayoutVerificacaoRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoVerificacao>{children}</SessaoVerificacao>;
}
