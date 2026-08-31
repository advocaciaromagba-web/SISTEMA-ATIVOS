"use client";

import { signOut } from "next-auth/react";

export function SairBotao() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/cliente/entrar" })}
      className="rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white transition hover:bg-white/10"
    >
      Sair
    </button>
  );
}
