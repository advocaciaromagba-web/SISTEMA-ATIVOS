import { exigirSessaoCompliance } from "@/lib/compliance/sessao";
import { FormularioProcesso } from "../formulario";

export default async function NovoProcesso() {
  await exigirSessaoCompliance();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Novo processo</h1>
        <p className="text-sm text-slate-500">
          Ao salvar, a análise de regularidade roda automaticamente: sessões, recursos, trânsito em julgado,
          homologação de cálculos, decisões conflitantes e pendências — a partir da movimentação pública do DataJud
          (CNJ).
        </p>
      </div>

      <FormularioProcesso />
    </div>
  );
}
