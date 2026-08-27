"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * As duas frentes da solução de licitações, em sub-abas.
 *
 * São dados isolados um do outro — a mesma empresa do mundo real pode
 * aparecer cadastrada como licitante numa frente e como participante de um
 * certame na outra, sem que um registro aponte para o outro. Por isso a
 * navegação também separa: trocar de aba é trocar de módulo, não de filtro.
 */
const ABAS = [
  {
    href: "/licitacoes/painel/licitantes",
    rotulo: "Licitantes",
    descricao: "Organize o dossiê da sua empresa e monte o envelope de cada edital.",
  },
  {
    href: "/licitacoes/painel/prefeituras",
    rotulo: "Prefeituras",
    descricao: "Analise e qualifique os participantes de um certame.",
  },
];

export function AbasLicitacoes({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Frente" className="flex flex-wrap gap-1 border-b border-slate-200">
        {ABAS.map((aba) => {
          const ativa = caminho.startsWith(aba.href);
          return (
            <Link
              key={aba.href}
              href={aba.href}
              role="tab"
              aria-selected={ativa}
              className={`-mb-px border-b-2 px-4 py-3 text-sm transition ${
                ativa
                  ? "border-slate-900 font-semibold text-slate-900"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`}
            >
              {aba.rotulo}
            </Link>
          );
        })}
      </div>

      <p className="text-sm text-slate-500">{ABAS.find((a) => caminho.startsWith(a.href))?.descricao}</p>

      {children}
    </div>
  );
}
