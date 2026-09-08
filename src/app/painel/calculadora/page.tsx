import { exigirSessao } from "@/lib/sessao";
import { FormularioCalculadora } from "./formulario";

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
