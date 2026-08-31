"use client";

import { SessionProvider } from "next-auth/react";

/** Provedor de sessão da solução de Due Diligence de Pessoas — rota própria. */
export function SessaoDiligencia({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/api/auth-diligencia">{children}</SessionProvider>;
}
