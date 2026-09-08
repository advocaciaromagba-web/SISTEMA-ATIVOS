import { exigirSessao } from "@/lib/sessao";
import { FormularioPessoa } from "../formulario";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function NovaPessoa() {
  await exigirSessao();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Nova parte</h1>
        <p className="text-sm text-slate-500">
          O que você preencher aqui é o que vai sair escrito nos contratos. Campos em branco aparecem marcados no
          documento.
        </p>
      </div>

      <FormularioPessoa />
    </div>
  );
}
