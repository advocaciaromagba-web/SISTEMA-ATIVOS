import Link from "next/link";
import type { Metadata } from "next";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { FormularioEntrarCliente } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default function EntrarCliente() {
  return (
    <main className="faixa-escura flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <MarcaLogo forma="simbolo" altura={64} prioridade />
          <h1 className="titulo mt-5 text-xl font-bold uppercase tracking-[0.16em] text-white">{marca.nome}</h1>
          <p className="serif mt-5 text-sm text-white/60">
            Uma conta só, para escolher e trocar entre as soluções que você assina.
          </p>
        </div>

        <FormularioEntrarCliente />

        <p className="mt-5 text-center text-sm text-white/60">
          Ainda não tem conta?{" "}
          <Link href="/cliente/cadastro" className="font-medium text-white underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
