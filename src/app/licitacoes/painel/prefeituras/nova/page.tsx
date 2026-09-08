import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { FormularioCertame } from "../formulario";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function NovoCertame() {
  await exigirSessaoLicitacoes();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Novo certame</h1>
        <p className="text-sm text-slate-500">
          Cadastre o certame para começar a registrar os participantes que se apresentaram.
        </p>
      </div>

      <FormularioCertame />
    </div>
  );
}
