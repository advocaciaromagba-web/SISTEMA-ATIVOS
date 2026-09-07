"use client";

import { SessionProvider } from "next-auth/react";

/** Provedor de sessão do Agrojud — rota própria. */
export function SessaoAgro({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/api/auth-agro">{children}</SessionProvider>;
}
