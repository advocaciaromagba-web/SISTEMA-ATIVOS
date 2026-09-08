import { exigirSessaoAgro } from "@/lib/agro/sessao";
import { marca } from "@/lib/marca";
import { BarraAgro } from "./barra";
import { AvisoVigenciaMp } from "./aviso-vigencia";

export default async function LayoutPainelAgro({ children }: { children: React.ReactNode }) {
  const { usuario, conta } = await exigirSessaoAgro();

  return (
    <div className="min-h-screen bg-slate-50">
      <BarraAgro marcaNome={marca.nome} contaNome={conta.nome} usuarioNome={usuario.nome} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* A MP tem prazo para acabar. O aviso fica em cima de tudo, em toda
            página do painel, porque quem abre um parecer precisa saber se a
            norma que ele aplica ainda está de pé. */}
        <AvisoVigenciaMp />
        {children}
      </main>
    </div>
  );
}
