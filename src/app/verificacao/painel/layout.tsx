import { exigirSessaoVerificacao } from "@/lib/verificacao/sessao";
import { marca } from "@/lib/marca";
import { BarraVerificacao } from "./barra";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function LayoutPainelVerificacao({ children }: { children: React.ReactNode }) {
  const { usuario, conta } = await exigirSessaoVerificacao();

  return (
    <div className="min-h-screen bg-slate-50">
      <BarraVerificacao marcaNome={marca.nome} contaNome={conta.nome} usuarioNome={usuario.nome} />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
