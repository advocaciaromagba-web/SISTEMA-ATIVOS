import type { Metadata } from "next";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { FormularioEntrarAdmin } from "./formulario";

export const metadata: Metadata = {
  title: "Administração",
  // Área interna não deve aparecer em buscador.
  robots: { index: false, follow: false },
};

export default function EntrarAdmin() {
  return (
    <main className="faixa-escura flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <MarcaLogo forma="simbolo" altura={64} prioridade />
          <h1 className="titulo mt-5 text-xl font-bold uppercase tracking-[0.16em] text-white">{marca.nome}</h1>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--marca-destaque)]">Administração</p>
          <p className="serif mt-5 text-sm text-white/60">
            Área interna. Todo acesso e toda ação feita aqui ficam registrados.
          </p>
        </div>

        <FormularioEntrarAdmin />
      </div>
    </main>
  );
}
