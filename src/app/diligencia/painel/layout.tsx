import { exigirSessaoDiligencia } from "@/lib/diligencia/sessao";
import { marca } from "@/lib/marca";
import { BarraDiligencia } from "./barra";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function LayoutPainelDiligencia({ children }: { children: React.ReactNode }) {
  const { usuario, conta } = await exigirSessaoDiligencia();

  return (
    <div className="min-h-screen bg-slate-50">
      <BarraDiligencia marcaNome={marca.nome} contaNome={conta.nome} usuarioNome={usuario.nome} />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
