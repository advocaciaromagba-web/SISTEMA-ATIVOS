import { exigirSessaoCompliance } from "@/lib/compliance/sessao";
import { FormularioEmpresa } from "../formulario";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function NovaEmpresa() {
  await exigirSessaoCompliance();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Nova empresa</h1>
        <p className="text-sm text-slate-500">
          Ao salvar, a empresa é auditada automaticamente — Receita, dívida ativa, sanções e punições.
        </p>
      </div>

      <FormularioEmpresa />
    </div>
  );
}
