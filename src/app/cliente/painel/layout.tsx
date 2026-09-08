import Link from "next/link";
import { exigirSessaoCliente } from "@/lib/cliente/sessao";
import { marca } from "@/lib/marca";
import { MarcaEscura } from "@/components/marca-logo";
import { SairBotao } from "./sair-botao";

export default async function LayoutPainelCliente({ children }: { children: React.ReactNode }) {
  const cliente = await exigirSessaoCliente();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="faixa-escura border-b-2 border-[color:var(--marca-destaque)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/cliente/painel" aria-label={marca.nome}>
            <MarcaEscura nome={marca.nome} assinatura="Central do assinante" />
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-white/80">{cliente.nome}</span>
            <SairBotao />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
