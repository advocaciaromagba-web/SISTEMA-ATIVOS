"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const ITENS = [
  { href: "/painel", rotulo: "Início" },
  { href: "/painel/operacoes", rotulo: "Operações" },
  { href: "/painel/pessoas", rotulo: "Partes" },
  { href: "/painel/documentos", rotulo: "Documentos" },
  { href: "/painel/auditoria", rotulo: "Auditoria" },
  { href: "/painel/configuracoes", rotulo: "Configurações" },
];

export function Navegacao({
  marcaNome,
  usuarioNome,
  organizacaoNome,
}: {
  marcaNome: string;
  usuarioNome: string;
  organizacaoNome: string;
}) {
  const caminho = usePathname();

  const ativo = (href: string) =>
    href === "/painel" ? caminho === "/painel" : caminho.startsWith(href);

  return (
    <header style={{ backgroundColor: "var(--marca)" }} className="text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/painel" className="text-lg font-semibold tracking-tight">
          {marcaNome}
        </Link>

        <nav className="flex flex-1 flex-wrap gap-1">
          {ITENS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                ativo(item.href) ? "bg-white/20 font-medium" : "text-white/80 hover:bg-white/10"
              }`}
            >
              {item.rotulo}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          <div className="text-right leading-tight">
            <div className="font-medium">{usuarioNome}</div>
            <div className="text-xs text-white/70">{organizacaoNome}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-white/30 px-3 py-1.5 text-xs transition hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
