import Link from "next/link";
import { marca } from "@/lib/marca";

/**
 * Moldura das páginas públicas.
 *
 * Tudo aqui sai da configuração da marca: quem instalar a plataforma para outra
 * empresa troca o .env e o site inteiro muda de dono, sem tocar no código.
 */

const PAGINAS = [
  { href: "/planos", rotulo: "Planos" },
  { href: "/fontes", rotulo: "O que verificamos" },
  { href: "/seguranca", rotulo: "Segurança" },
  { href: "/institucional", rotulo: "A empresa" },
];

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
          <Link href="/" className="text-lg font-semibold" style={{ color: "var(--marca)" }}>
            {marca.nome}
          </Link>

          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {PAGINAS.map((p) => (
              <Link key={p.href} href={p.href} className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
                {p.rotulo}
              </Link>
            ))}
          </nav>

          <Link href="/login" className="botao-principal py-1.5 text-sm">
            Entrar
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-slate-600">
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <div className="min-w-56">
              <div className="font-medium text-slate-900">{marca.razaoSocial || marca.nome}</div>
              {marca.cnpj && <div className="mt-1">CNPJ {marca.cnpj}</div>}
              {marca.endereco && <div className="mt-1">{marca.endereco}</div>}
              {marca.emailSuporte && <div className="mt-1">{marca.emailSuporte}</div>}
              {marca.telefone && <div className="mt-1">{marca.telefone}</div>}
            </div>

            <div className="flex flex-col gap-1">
              <Link href="/termos" className="hover:underline">
                Termos de uso
              </Link>
              <Link href="/privacidade" className="hover:underline">
                Política de privacidade
              </Link>
              <Link href="/seguranca" className="hover:underline">
                Segurança
              </Link>
              <Link href="/fontes" className="hover:underline">
                Fontes consultadas
              </Link>
            </div>
          </div>

          <p className="mt-8 border-t border-slate-100 pt-6 text-xs leading-relaxed text-slate-500">
            {marca.nome} é uma plataforma de gestão, geração de documentos e verificação de contrapartes.{" "}
            <strong>Não é escritório de advocacia e não presta consultoria jurídica.</strong> Os documentos gerados
            são minutas, que devem ser revisadas por advogado antes da assinatura. As verificações refletem o que
            as fontes públicas mostravam na data da consulta e não constituem atestado de idoneidade nem
            recomendação de investimento.
          </p>
        </div>
      </footer>
    </div>
  );
}
