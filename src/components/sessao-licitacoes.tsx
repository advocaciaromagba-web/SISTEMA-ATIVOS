"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Provedor de sessão da solução de Licitações.
 *
 * `basePath` aponta para a rota de autenticação própria desta solução — sem
 * isso, o botão de entrar/sair chamaria `/api/auth`, que é o login da
 * Gestão de Ativos.
 */
export function SessaoLicitacoes({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/api/auth-licitacoes">{children}</SessionProvider>;
}
