import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { FormularioDuasEtapas } from "./formulario";
import { FormularioCertificadoLicitacoes, type DadosCertificadoNaTela } from "./certificado-form";
import { cofreConfigurado } from "@/lib/seguranca/cofre";
import { dataCurta } from "@/lib/formato";
import { formatarDocumentoDoCertificado } from "@/lib/licitacoes/assinatura";

export const dynamic = "force-dynamic";

type CertificadoGravado = {
  titular?: string | null;
  documento?: string | null;
  emissor?: string | null;
  numeroSerie?: string | null;
  certificadosNaCadeia?: number | null;
  temCadeia?: boolean | null;
};

export default async function SegurancaLicitacoes() {
  const { usuario, conta } = await exigirSessaoLicitacoes();

  const gravado = (conta.certificadoDados as CertificadoGravado | null) ?? null;
  const dados: DadosCertificadoNaTela | null = gravado
    ? {
        titular: gravado.titular ?? null,
        documento: formatarDocumentoDoCertificado(gravado.documento ?? null),
        emissor: gravado.emissor ?? null,
        numeroSerie: gravado.numeroSerie ?? null,
        certificadosNaCadeia: gravado.certificadosNaCadeia ?? null,
        temCadeia: gravado.temCadeia ?? null,
      }
    : null;

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

      <section className="cartao">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Certificado digital para assinar (A1)</h3>
        <FormularioCertificadoLicitacoes
          nome={conta.certificadoNome}
          enviadoEm={conta.certificadoEnviadoEm ? dataCurta(conta.certificadoEnviadoEm) : null}
          validade={conta.certificadoValidade ? dataCurta(conta.certificadoValidade) : null}
          vencido={Boolean(conta.certificadoValidade && conta.certificadoValidade < new Date())}
          dados={dados}
          ehDono={usuario.papel === "DONO"}
          cofrePronto={cofreConfigurado()}
        />
      </section>
    </div>
  );
}
