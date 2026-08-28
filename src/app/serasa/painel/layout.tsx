import { exigirSessaoSerasa } from "@/lib/serasa/sessao";
import { marca } from "@/lib/marca";
import { BarraSerasa } from "./barra";

export default async function LayoutPainelSerasa({ children }: { children: React.ReactNode }) {
  const { usuario, conta } = await exigirSessaoSerasa();

  return (
    <div className="min-h-screen bg-slate-50">
      <BarraSerasa
        marcaNome={marca.nome}
        contaNome={conta.nome}
        usuarioNome={usuario.nome}
        saldoCredito={conta.saldoCredito.toString()}
      />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
