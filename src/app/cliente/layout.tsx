import { SessaoCliente } from "@/components/sessao-cliente";

/** Tudo sob /cliente usa a sessão própria do Cliente. */
export default function LayoutClienteRaiz({ children }: { children: React.ReactNode }) {
  return <SessaoCliente>{children}</SessaoCliente>;
}
