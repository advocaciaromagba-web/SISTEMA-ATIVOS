"use client";

import { SessionProvider } from "next-auth/react";

/** Provedor de sessão da solução de Compliance de Empresas — rota própria. */
export function SessaoCompliance({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/api/auth-compliance">{children}</SessionProvider>;
}
