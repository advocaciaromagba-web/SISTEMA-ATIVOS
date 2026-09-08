import { SessaoDiligencia } from "@/components/sessao-diligencia";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** Tudo sob /diligencia usa a sessão própria desta solução. */
export default function LayoutDiligenciaRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoDiligencia>{children}</SessaoDiligencia>;
}
