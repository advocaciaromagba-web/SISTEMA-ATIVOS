import { SessaoDiligencia } from "@/components/sessao-diligencia";

/** Tudo sob /diligencia usa a sessão própria desta solução. */
export default function LayoutDiligenciaRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoDiligencia>{children}</SessaoDiligencia>;
}
