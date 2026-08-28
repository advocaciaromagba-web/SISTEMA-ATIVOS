"use client";

import { SessionProvider } from "next-auth/react";

/** Provedor de sessão da solução de Consulta Cadastral SERASA — rota própria. */
export function SessaoSerasa({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/api/auth-serasa">{children}</SessionProvider>;
}
