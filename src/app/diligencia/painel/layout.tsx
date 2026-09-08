import { exigirSessaoDiligencia } from "@/lib/diligencia/sessao";
import { marca } from "@/lib/marca";
import { BarraDiligencia } from "./barra";

export default async function LayoutPainelDiligencia({ children }: { children: React.ReactNode }) {
  const { usuario, conta } = await exigirSessaoDiligencia();

  return (
    <div className="min-h-screen bg-slate-50">
      <BarraDiligencia marcaNome={marca.nome} contaNome={conta.nome} usuarioNome={usuario.nome} />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
