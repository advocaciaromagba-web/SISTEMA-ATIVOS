import { exigirSessaoDiligencia } from "@/lib/diligencia/sessao";
import { FormularioPessoa } from "../formulario";

export default async function NovaPessoa() {
  await exigirSessaoDiligencia();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Nova pessoa</h1>
        <p className="text-sm text-slate-500">
          Ao salvar, a pessoa é auditada automaticamente — sanções, dívida ativa e, quando contratado, bureau de
          crédito, mandado de prisão e improbidade.
        </p>
      </div>

      <FormularioPessoa />
    </div>
  );
}
