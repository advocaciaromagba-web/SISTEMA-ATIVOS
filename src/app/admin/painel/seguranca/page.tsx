import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { FormularioDuasEtapas } from "./formulario";

export const dynamic = "force-dynamic";

export default async function SegurancaAdmin() {
  const admin = await exigirSessaoAdmin();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Segurança da sua conta</h1>
        <p className="mt-1 text-sm text-slate-500">
          Esta conta enxerga e altera os dados de todos os clientes, em todas as soluções. É a única do sistema com
          esse alcance — e por isso a que mais precisa do segundo fator.
        </p>
      </div>

      <section className="cartao">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Verificação em duas etapas</h2>
        <FormularioDuasEtapas ativado={admin.totpAtivado} />
      </section>

      <p className="text-xs text-slate-400">
        Ativar e desligar a verificação em duas etapas ficam registrados na auditoria, como qualquer outra ação.
      </p>
    </div>
  );
}
