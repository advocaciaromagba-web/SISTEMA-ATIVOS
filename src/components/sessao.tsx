"use client";

import { SessionProvider } from "next-auth/react";

/** O NextAuth precisa de um provedor do lado do navegador para o botão de sair. */
export function Sessao({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
