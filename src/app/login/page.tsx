import type { Metadata } from "next";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default function Login() {
  return (
    // A entrada é a primeira tela de quem paga pelo sistema. Fundo azul da
    // marca, com o símbolo em tamanho grande — é o único lugar onde ele cabe
    // assim, sem competir com conteúdo.
    <main className="faixa-escura flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <MarcaLogo forma="simbolo" altura={64} prioridade />
          <h1 className="titulo mt-5 text-xl font-bold uppercase tracking-[0.16em] text-white">{marca.nome}</h1>
          {marca.assinatura && (
            <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--marca-destaque)]">
              {marca.assinatura}
            </p>
          )}
          <p className="serif mt-5 text-sm text-white/60">Acesso restrito a assinantes.</p>
        </div>

        <FormularioLogin />
      </div>
    </main>
  );
}
