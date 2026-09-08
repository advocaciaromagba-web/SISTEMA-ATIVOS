import Link from "next/link";
import type { Metadata } from "next";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { FormularioCadastroAgro } from "./formulario";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "Assinar Agrojud" };

export default function CadastroAgro() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <MarcaLogo altura={32} prioridade />
          <h1 className="titulo mt-4 text-xl font-semibold text-slate-900">Assinar Agrojud</h1>
          <p className="mt-2 text-sm text-slate-500">
            Conta própria desta solução da {marca.nome} — independente de qualquer outra assinatura que você tenha.
          </p>
        </div>

        <FormularioCadastroAgro />

        <p className="mt-5 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/agrojud/entrar" className="font-medium underline">
            Entrar
          </Link>{" "}
          ·{" "}
          <Link href="/agrojud/planos" className="font-medium underline">
            Ver planos e preços
          </Link>
        </p>
      </div>
    </main>
  );
}
