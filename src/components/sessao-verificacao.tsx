"use client";

import { SessionProvider } from "next-auth/react";

/** Provedor de sessão da solução de Verificação de Documentos — rota própria. */
export function SessaoVerificacao({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/api/auth-verificacao">{children}</SessionProvider>;
}
