import Link from "next/link";
import type { Metadata } from "next";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { FormularioEntrarLicitacoes } from "./formulario";

export const metadata: Metadata = { title: "Entrar — Licitações" };

export default function EntrarLicitacoes() {
  return (
    <main className="faixa-escura flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <MarcaLogo forma="simbolo" altura={64} prioridade />
          <h1 className="titulo mt-5 text-xl font-bold uppercase tracking-[0.16em] text-white">{marca.nome}</h1>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--marca-destaque)]">
            Análise de Licitações
          </p>
          <p className="serif mt-5 text-sm text-white/60">
            Acesso próprio desta solução — independente da sua conta de outras soluções da {marca.nome}.
          </p>
        </div>

        <FormularioEntrarLicitacoes />

        <p className="mt-5 text-center text-sm text-white/60">
          Ainda não tem conta?{" "}
          <Link href="/licitacoes/cadastro" className="font-medium text-white underline">
            Assine a solução
          </Link>
        </p>
      </div>
    </main>
  );
}
