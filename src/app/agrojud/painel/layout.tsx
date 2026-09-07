import { exigirSessaoAgro } from "@/lib/agro/sessao";
import { marca } from "@/lib/marca";
import { BarraAgro } from "./barra";

export default async function LayoutPainelAgro({ children }: { children: React.ReactNode }) {
  const { usuario, conta } = await exigirSessaoAgro();

  return (
    <div className="min-h-screen bg-slate-50">
      <BarraAgro marcaNome={marca.nome} contaNome={conta.nome} usuarioNome={usuario.nome} />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
