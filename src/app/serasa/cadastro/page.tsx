import Link from "next/link";
import type { Metadata } from "next";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { PRECO_CONSULTA } from "@/lib/serasa/fonte";
import { FormularioCadastroSerasa } from "./formulario";

export const metadata: Metadata = { title: "Assinar Consulta Cadastral" };

export default function CadastroSerasa() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <MarcaLogo altura={32} prioridade />
          <h1 className="titulo mt-4 text-xl font-semibold text-slate-900">Assinar Consulta Cadastral</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sem mensalidade — carregue crédito e pague só pelas consultas que fizer, a{" "}
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(PRECO_CONSULTA)} cada uma.
          </p>
        </div>

        <FormularioCadastroSerasa />

        <p className="mt-5 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/serasa/entrar" className="font-medium underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
