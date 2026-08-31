"use client";

import { SessionProvider } from "next-auth/react";

/** Provedor de sessão do Cliente — a conta única, separada das seis soluções. */
export function SessaoCliente({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/api/auth-cliente">{children}</SessionProvider>;
}
