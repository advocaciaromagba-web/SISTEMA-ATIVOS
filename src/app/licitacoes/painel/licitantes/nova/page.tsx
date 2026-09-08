import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { FormularioLicitante } from "../formulario";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function NovaLicitante() {
  await exigirSessaoLicitacoes();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Nova empresa licitante</h1>
        <p className="text-sm text-slate-500">
          O que você preencher aqui é o que vai sair nas declarações de habilitação de qualquer certame — cadastre
          uma vez.
        </p>
      </div>

      <FormularioLicitante />
    </div>
  );
}
