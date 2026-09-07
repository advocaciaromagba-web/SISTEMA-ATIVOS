"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { MarcaLogo } from "@/components/marca-logo";

const ABAS = [
  { href: "/admin/painel", rotulo: "Visão geral" },
  { href: "/admin/painel/contas", rotulo: "Contas" },
  { href: "/admin/painel/planos", rotulo: "Planos" },
  { href: "/admin/painel/contratos", rotulo: "Contratos" },
  { href: "/admin/painel/financeiro", rotulo: "Financeiro" },
  { href: "/admin/painel/custos", rotulo: "Custos" },
  { href: "/admin/painel/auditoria", rotulo: "Auditoria" },
];

export function BarraAdmin({ nome, email }: { nome: string; email: string }) {
  const caminho = usePathname();

  return (
    <header className="border-b border-slate-800 bg-slate-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <MarcaLogo forma="simbolo" altura={28} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--marca-destaque)]">
              Administração
            </p>
            <p className="text-[11px] text-slate-400">{nome}</p>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {ABAS.map((aba) => {
            const ativa = aba.href === "/admin/painel" ? caminho === aba.href : caminho.startsWith(aba.href);
            return (
              <Link
                key={aba.href}
                href={aba.href}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  ativa ? "bg-slate-800 font-medium text-white" : "text-slate-300 hover:text-white"
                }`}
              >
                {aba.rotulo}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-400 sm:inline">{email}</span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/entrar" })}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
