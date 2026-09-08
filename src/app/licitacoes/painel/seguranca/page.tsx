import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { FormularioDuasEtapas } from "./formulario";

export const dynamic = "force-dynamic";

export default async function SegurancaLicitacoes() {
  const { usuario } = await exigirSessaoLicitacoes();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Segurança</h2>
        <p className="text-sm text-slate-500">
          A senha e a verificação em duas etapas desta conta são próprias da solução de Licitações — não têm
          relação com o acesso de nenhuma outra solução.
        </p>
      </div>

      <section className="cartao">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Verificação em duas etapas</h3>
        <FormularioDuasEtapas ativado={usuario.totpAtivado} />
      </section>
    </div>
  );
}
