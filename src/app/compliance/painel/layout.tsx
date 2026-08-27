import { exigirSessaoCompliance } from "@/lib/compliance/sessao";
import { marca } from "@/lib/marca";
import { BarraCompliance } from "./barra";

export default async function LayoutPainelCompliance({ children }: { children: React.ReactNode }) {
  const { usuario, conta } = await exigirSessaoCompliance();

  return (
    <div className="min-h-screen bg-slate-50">
      <BarraCompliance marcaNome={marca.nome} contaNome={conta.nome} usuarioNome={usuario.nome} />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
