"use client";

import { SessionProvider } from "next-auth/react";

/** Provedor de sessão da administração — rota e cookie próprios. */
export function SessaoAdmin({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/api/auth-admin">{children}</SessionProvider>;
}
