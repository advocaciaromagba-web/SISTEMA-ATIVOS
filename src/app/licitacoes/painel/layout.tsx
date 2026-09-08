import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { marca } from "@/lib/marca";
import { BarraLicitacoes } from "./barra";
import { AbasLicitacoes } from "./abas";

export default async function LayoutPainelLicitacoes({ children }: { children: React.ReactNode }) {
  const { usuario, conta } = await exigirSessaoLicitacoes();

  return (
    <div className="min-h-screen bg-slate-50">
      <BarraLicitacoes marcaNome={marca.nome} contaNome={conta.nome} usuarioNome={usuario.nome} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Licitações</h1>
          <p className="text-sm text-slate-500">Duas frentes, com cadastro próprio cada uma.</p>
        </div>
        <AbasLicitacoes>{children}</AbasLicitacoes>
      </main>
    </div>
  );
}
