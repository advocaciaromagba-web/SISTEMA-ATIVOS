import { SessaoAdmin } from "@/components/sessao-admin";

/** Tudo sob /admin usa a sessão própria da administração. */
export default function LayoutAdminRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoAdmin>{children}</SessaoAdmin>;
}
