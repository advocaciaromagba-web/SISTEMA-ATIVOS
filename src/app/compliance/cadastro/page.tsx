import Link from "next/link";
import type { Metadata } from "next";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { FormularioCadastroCompliance } from "./formulario";

export const metadata: Metadata = { title: "Assinar Compliance" };

export default function CadastroCompliance() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <MarcaLogo altura={32} prioridade />
          <h1 className="titulo mt-4 text-xl font-semibold text-slate-900">Assinar Compliance de Empresas</h1>
          <p className="mt-2 text-sm text-slate-500">
            Conta própria desta solução da {marca.nome} — independente de qualquer outra assinatura que você tenha.
          </p>
        </div>

        <FormularioCadastroCompliance />

        <p className="mt-5 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/compliance/entrar" className="font-medium underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
