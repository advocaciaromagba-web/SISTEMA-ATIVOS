import Link from "next/link";
import type { Metadata } from "next";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { FormularioCadastroCliente } from "./formulario";

export const metadata: Metadata = { title: "Criar conta" };

export default function CadastroCliente() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <MarcaLogo altura={32} prioridade />
          <h1 className="titulo mt-4 text-xl font-semibold text-slate-900">Criar conta</h1>
          <p className="mt-2 text-sm text-slate-500">
            Uma conta só na {marca.nome}. Depois de entrar, você escolhe quais das seis soluções quer assinar — e
            troca entre elas sem precisar logar de novo em cada uma.
          </p>
        </div>

        <FormularioCadastroCliente />

        <p className="mt-5 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/cliente/entrar" className="font-medium underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
