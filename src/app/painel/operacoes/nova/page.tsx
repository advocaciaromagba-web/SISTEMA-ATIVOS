import { exigirSessao } from "@/lib/sessao";
import { FormularioOperacao } from "../formulario";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function NovaOperacao() {
  await exigirSessao();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Nova operação</h1>
        <p className="text-sm text-slate-500">
          Depois de criar, você vincula as partes e gera os documentos a partir daqui.
        </p>
      </div>

      <FormularioOperacao />
    </div>
  );
}
