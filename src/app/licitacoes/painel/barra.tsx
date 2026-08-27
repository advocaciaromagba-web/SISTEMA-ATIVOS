"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { MarcaEscura } from "@/components/marca-logo";

/**
 * Barra superior da solução de Licitações — própria, com seu próprio botão
 * de sair, que encerra só esta sessão. Sair daqui não afeta uma sessão
 * aberta da Gestão de Ativos no mesmo navegador, nem o contrário.
 */
export function BarraLicitacoes({ marcaNome, contaNome, usuarioNome }: { marcaNome: string; contaNome: string; usuarioNome: string }) {
  return (
    <header className="faixa-escura border-b-2 border-[color:var(--marca-destaque)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/licitacoes/painel" aria-label={marcaNome}>
          <MarcaEscura nome={marcaNome} assinatura="Análise de Licitações" />
        </Link>

        <div className="flex flex-1 items-center justify-end gap-3 text-sm">
          <Link href="/licitacoes/painel/seguranca" className="text-white/70 hover:text-white hover:underline">
            Segurança
          </Link>
          <div className="text-right leading-tight text-white">
            <div className="font-medium">{usuarioNome}</div>
            <div className="text-xs text-white/60">{contaNome}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/licitacoes/entrar" })}
            className="rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white transition hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
