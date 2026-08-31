import Link from "next/link";
import type { Metadata } from "next";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { FormularioRedefinirSenha } from "./formulario";

export const metadata: Metadata = { title: "Redefinir senha — Análise de Licitações" };

export default function RedefinirSenhaLicitacoes({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? "";

  return (
    <main className="faixa-escura flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <MarcaLogo forma="simbolo" altura={64} prioridade />
          <h1 className="titulo mt-5 text-xl font-bold uppercase tracking-[0.16em] text-white">{marca.nome}</h1>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--marca-destaque)]">
            Análise de Licitações
          </p>
        </div>

        {token ? (
          <FormularioRedefinirSenha token={token} />
        ) : (
          <div className="cartao space-y-4 text-sm text-slate-700">
            <p>Link inválido. Peça um novo em &quot;esqueci minha senha&quot;.</p>
            <Link href="/licitacoes/esqueci-senha" className="botao-principal block w-full text-center">
              Esqueci minha senha
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
