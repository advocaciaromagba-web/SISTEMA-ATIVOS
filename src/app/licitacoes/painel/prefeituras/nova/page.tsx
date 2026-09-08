import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { FormularioCertame } from "../formulario";

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
