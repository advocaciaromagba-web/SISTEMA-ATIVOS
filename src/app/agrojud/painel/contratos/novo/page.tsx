import Link from "next/link";
import { exigirSessaoAgro } from "@/lib/agro/sessao";
import { iaConfigurada } from "@/lib/ia/claude";
import { FormularioNovoContrato } from "./formulario";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function NovoContratoAgro() {
  await exigirSessaoAgro();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/agrojud/painel/contratos" className="text-sm text-slate-500 hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Novo contrato</h1>
        <p className="mt-1 text-sm text-slate-500">
          Preencha os campos abaixo (ou envie o PDF e use "Preencher com IA" para um rascunho — sempre revise antes
          de enviar). O parecer de enquadramento é gerado por regras fixas, direto do texto da Lei 4.829/65 e da MP
          1.376/2026, nunca pela IA.
        </p>
      </div>

      <FormularioNovoContrato iaDisponivel={iaConfigurada()} />
    </div>
  );
}
