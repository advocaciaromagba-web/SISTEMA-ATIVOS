import Link from "next/link";
import type { Metadata } from "next";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { FormularioEsqueciSenha } from "./formulario";

export const metadata: Metadata = { title: "Esqueci minha senha — Due Diligence de Pessoas" };

export default function EsqueciSenhaDiligencia() {
  return (
    <main className="faixa-escura flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <MarcaLogo forma="simbolo" altura={64} prioridade />
          <h1 className="titulo mt-5 text-xl font-bold uppercase tracking-[0.16em] text-white">{marca.nome}</h1>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--marca-destaque)]">
            Due Diligence de Pessoas
          </p>
          <p className="serif mt-5 text-sm text-white/60">Informe o e-mail da conta para receber o link de redefinição.</p>
        </div>

        <FormularioEsqueciSenha />

        <p className="mt-5 text-center text-sm text-white/60">
          <Link href="/diligencia/entrar" className="font-medium text-white underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  );
}
