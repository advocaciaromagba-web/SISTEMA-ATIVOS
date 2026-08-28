"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { MarcaEscura } from "@/components/marca-logo";

const moeda = (valor: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor));

export function BarraSerasa({
  marcaNome,
  contaNome,
  usuarioNome,
  saldoCredito,
}: {
  marcaNome: string;
  contaNome: string;
  usuarioNome: string;
  saldoCredito: string;
}) {
  return (
    <header className="faixa-escura border-b-2 border-[color:var(--marca-destaque)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/serasa/painel" aria-label={marcaNome}>
          <MarcaEscura nome={marcaNome} assinatura="Consulta Cadastral" />
        </Link>

        <nav className="flex flex-1 items-center gap-4 text-sm">
          <Link href="/serasa/painel/consultas" className="text-white/80 hover:text-white hover:underline">
            Consultas
          </Link>
        </nav>

        <div className="flex items-center gap-3 text-sm">
          <span className="etiqueta border border-white/20 bg-white/10 font-medium text-white/90">
            saldo {moeda(saldoCredito)}
          </span>
          <Link href="/serasa/painel/seguranca" className="text-white/70 hover:text-white hover:underline">
            Segurança
          </Link>
          <div className="text-right leading-tight text-white">
            <div className="font-medium">{usuarioNome}</div>
            <div className="text-xs text-white/60">{contaNome}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/serasa/entrar" })}
            className="rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white transition hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
