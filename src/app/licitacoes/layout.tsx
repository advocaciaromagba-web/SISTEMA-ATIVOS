import { SessaoLicitacoes } from "@/components/sessao-licitacoes";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Tudo sob /licitacoes usa a sessão própria desta solução, nunca a da
 * Gestão de Ativos — mesmo estando dentro do mesmo domínio e do mesmo
 * layout raiz.
 */
export default function LayoutLicitacoesRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoLicitacoes>{children}</SessaoLicitacoes>;
}
