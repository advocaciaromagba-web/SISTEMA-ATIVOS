import { exigirSessao } from "@/lib/sessao";
import { FormularioCalculadora } from "./formulario";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const dynamic = "force-dynamic";

export default async function Calculadora() {
  await exigirSessao();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Calculadora de precatório</h1>
        <p className="text-sm text-slate-500">
          Atualiza o valor pela legislação vigente, aplica as deduções e mostra quanto sobra para cada lado da
          cessão. Os índices vêm das séries oficiais do Banco Central.
        </p>
      </div>

      <FormularioCalculadora />
    </div>
  );
}
