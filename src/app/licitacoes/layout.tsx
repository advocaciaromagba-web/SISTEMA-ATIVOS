import { SessaoLicitacoes } from "@/components/sessao-licitacoes";

/**
 * Tudo sob /licitacoes usa a sessão própria desta solução, nunca a da
 * Gestão de Ativos — mesmo estando dentro do mesmo domínio e do mesmo
 * layout raiz.
 */
export default function LayoutLicitacoesRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoLicitacoes>{children}</SessaoLicitacoes>;
}
