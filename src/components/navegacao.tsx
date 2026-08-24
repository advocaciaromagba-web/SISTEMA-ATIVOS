"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { MarcaEscura } from "./marca-logo";

const ITENS = [
  { href: "/painel", rotulo: "Início" },
  { href: "/painel/operacoes", rotulo: "Operações" },
  { href: "/painel/pessoas", rotulo: "Partes" },
  { href: "/painel/documentos", rotulo: "Documentos" },
  { href: "/painel/calculadora", rotulo: "Calculadora" },
  { href: "/painel/auditoria", rotulo: "Auditoria" },
  { href: "/painel/avulsos", rotulo: "Avulsos" },
  { href: "/painel/registros", rotulo: "Registros" },
  { href: "/painel/configuracoes", rotulo: "Configurações" },
];

export function Navegacao({
  marcaNome,
  marcaAssinatura,
  usuarioNome,
  organizacaoNome,
}: {
  marcaNome: string;
  marcaAssinatura?: string;
  usuarioNome: string;
  organizacaoNome: string;
}) {
  const caminho = usePathname();

  const ativo = (href: string) =>
    href === "/painel" ? caminho === "/painel" : caminho.startsWith(href);

  return (
    // O filete dourado separa a barra do conteudo sem pesar: e a mesma regua
    // fina que aparece sob o nome no lockup vertical da marca.
    <header className="faixa-escura border-b-2 border-[color:var(--marca-destaque)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/painel" aria-label={marcaNome}>
          <MarcaEscura nome={marcaNome} assinatura={marcaAssinatura} />
        </Link>

        <nav className="flex flex-1 flex-wrap gap-1">
          {ITENS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                ativo(item.href)
                  ? "bg-white/15 font-semibold text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.rotulo}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          <div className="text-right leading-tight">
            <div className="font-medium">{usuarioNome}</div>
            <div className="text-xs text-white/60">{organizacaoNome}</div>
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
