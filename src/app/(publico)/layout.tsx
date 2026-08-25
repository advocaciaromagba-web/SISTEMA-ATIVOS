import Link from "next/link";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";

/**
 * Moldura das páginas públicas.
 *
 * Tudo aqui sai da configuração da marca: quem instalar a plataforma para outra
 * empresa troca o .env e o site inteiro muda de dono, sem tocar no código.
 */

const PAGINAS = [
  { href: "/solucoes", rotulo: "Soluções" },
  { href: "/planos", rotulo: "Planos" },
  { href: "/fontes", rotulo: "O que verificamos" },
  { href: "/seguranca", rotulo: "Segurança" },
  { href: "/institucional", rotulo: "A empresa" },
];

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5">
          <Link href="/" aria-label={marca.nome} className="shrink-0">
            <MarcaLogo altura={34} prioridade />
          </Link>

          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {PAGINAS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
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

      {/* Rodapé escuro: é onde ficam CNPJ, endereço e as ressalvas. Numa
          plataforma que vive de credibilidade, esse bloco é parte do produto —
          empresa que se identifica por extenso é empresa que se deixa achar. */}
      <footer className="faixa-escura">
        <div className="mx-auto max-w-5xl px-4 py-12 text-sm">
          <div className="flex flex-wrap justify-between gap-x-8 gap-y-8">
            <div className="min-w-56 max-w-sm">
              <MarcaLogo forma="simbolo" altura={40} className="mb-4" />
              <div className="titulo text-base font-semibold text-white">{marca.razaoSocial || marca.nome}</div>
              <div className="mt-2 space-y-1 text-white/70">
                {marca.cnpj && <div>CNPJ {marca.cnpj}</div>}
                {marca.endereco && <div>{marca.endereco}</div>}
                {marca.emailSuporte && (
                  <div>
                    <a href={`mailto:${marca.emailSuporte}`} className="hover:text-white hover:underline">
                      {marca.emailSuporte}
                    </a>
                  </div>
                )}
                {marca.telefone && <div>{marca.telefone}</div>}
              </div>
            </div>

            <div>
              <div className="sobretitulo mb-3">Documentos</div>
              <div className="flex flex-col gap-1.5 text-white/70">
                <Link href="/termos" className="hover:text-white hover:underline">
                  Termos de uso
                </Link>
                <Link href="/privacidade" className="hover:text-white hover:underline">
                  Política de privacidade
                </Link>
                <Link href="/seguranca" className="hover:text-white hover:underline">
                  Segurança
                </Link>
                <Link href="/fontes" className="hover:text-white hover:underline">
                  Fontes consultadas
                </Link>
              </div>
            </div>
          </div>

          {marca.notaLegal && (
            <p className="serif mt-8 border-t border-white/15 pt-6 text-xs leading-relaxed text-white/60">
              {marca.notaLegal}
            </p>
          )}

          <p
            className={`serif text-xs leading-relaxed text-white/60 ${
              marca.notaLegal ? "mt-4" : "mt-10 border-t border-white/15 pt-6"
            }`}
          >
            {marca.nome} é uma plataforma de gestão, geração de documentos e verificação de contrapartes.{" "}
            <strong className="font-semibold text-white/80">
              Não é escritório de advocacia e não presta consultoria jurídica.
            </strong>{" "}
            Os documentos gerados são minutas, que devem ser revisadas por advogado antes da assinatura. As
            verificações refletem o que as fontes públicas mostravam na data da consulta e não constituem atestado
            de idoneidade nem recomendação de investimento.
          </p>
        </div>
      </footer>
    </div>
  );
}
