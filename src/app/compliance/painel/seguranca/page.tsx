import { exigirSessaoCompliance } from "@/lib/compliance/sessao";
import { FormularioDuasEtapas } from "./formulario";
import { FormularioCertificado } from "./certificado-form";
import { cofreConfigurado } from "@/lib/seguranca/cofre";
import { dataCurta } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function SegurancaCompliance() {
  const { usuario, conta } = await exigirSessaoCompliance();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Segurança</h2>
        <p className="text-sm text-slate-500">
          A senha e a verificação em duas etapas desta conta são próprias da solução de Compliance de Empresas —
          não têm relação com o acesso de nenhuma outra solução.
        </p>
      </div>

      <section className="cartao">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Verificação em duas etapas</h3>
        <FormularioDuasEtapas ativado={usuario.totpAtivado} />
      </section>

      <section className="cartao">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Certificado digital da empresa</h3>
        <FormularioCertificado
          nome={conta.certificadoNome}
          enviadoEm={conta.certificadoEnviadoEm ? dataCurta(conta.certificadoEnviadoEm) : null}
          validade={conta.certificadoValidade ? dataCurta(conta.certificadoValidade) : null}
          ehDono={usuario.papel === "DONO"}
          cofrePronto={cofreConfigurado()}
        />
      </section>
    </div>
  );
}
