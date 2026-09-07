import Link from "next/link";
import { contaLogadaDaSolucao } from "@/lib/sessao-por-solucao";
import { situacaoDaAssinatura } from "@/lib/assinatura-solucao";
import { planosDaSolucao, configuracaoDaSolucao } from "@/lib/planos-solucao";
import { contratoVigente } from "@/lib/contratos-solucao";
import { moeda } from "@/lib/formato";
import { FormularioAssinar, FormularioCancelar } from "./formularios";

/**
 * Tela de assinatura de UMA solução, dentro do painel dela.
 *
 * Tudo aqui é daquela solução: os planos, os preços, o contrato e a cobrança.
 * Não existe caminho nesta tela que leve a assinar outra coisa — antes havia,
 * e era exatamente onde as soluções se misturavam.
 */
export async function PainelAssinatura({
  solucao,
  rotulo,
  paginaTermos,
}: {
  solucao: string;
  rotulo: string;
  paginaTermos: string;
}) {
  const conta = await contaLogadaDaSolucao(solucao);
  if (!conta) return null;

  const [situacao, planos, config, contrato] = await Promise.all([
    situacaoDaAssinatura(solucao, conta.contaId),
    planosDaSolucao(solucao),
    configuracaoDaSolucao(solucao),
    contratoVigente(solucao),
  ]);

  const planoAtual = planos.find((p) => p.chave === situacao?.plano) ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Assinatura — {rotulo}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Esta assinatura vale só para {rotulo}. Se você usa outras soluções da plataforma, cada uma tem a própria
          assinatura, o próprio preço e o próprio contrato — e cancelar aqui não mexe em nenhuma delas.
        </p>
      </div>

      <div className="cartao">
        <p className="text-xs uppercase tracking-wide text-slate-500">Situação atual</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">
          {situacao?.temCobranca
            ? `Assinatura ativa${planoAtual ? ` — plano ${planoAtual.nome}` : ""}`
            : situacao?.statusAssinatura === "TESTE"
              ? "Em período de teste"
              : situacao?.statusAssinatura === "CANCELADA"
                ? "Assinatura cancelada"
                : "Sem cobrança configurada"}
        </p>
        {!situacao?.temCobranca && situacao?.statusAssinatura === "TESTE" && (
          <p className="mt-1 text-sm text-slate-600">
            O teste desta solução dura {config.diasDeTeste} dia(s) e inclui {config.consultasGratisTeste} análise(s).
            Assinando agora, você não paga nada hoje: a primeira cobrança é marcada para o fim do teste.
          </p>
        )}
      </div>

      {contrato && (
        <p className="text-sm text-slate-600">
          Ao assinar você aceita o{" "}
          <Link href={paginaTermos} className="font-medium underline">
            contrato desta solução
          </Link>{" "}
          (versão {contrato.versao}). O aceite fica registrado com a data e a impressão digital do texto.
        </p>
      )}

      {situacao?.temCobranca ? (
        <FormularioCancelar solucao={solucao} rotulo={rotulo} />
      ) : planos.length === 0 ? (
        <div className="cartao text-sm text-slate-500">
          Esta solução ainda não tem planos cadastrados. Fale com o suporte antes de contratar.
        </div>
      ) : (
        <FormularioAssinar
          solucao={solucao}
          planos={planos.map((p) => ({
            chave: p.chave,
            nome: p.nome,
            precoMensal: p.precoMensal,
            precoAnual: p.precoAnual,
            precoMensalTexto: moeda(p.precoMensal),
            precoAnualTexto: moeda(p.precoAnual),
            destaque: p.destaque,
            paraQuem: p.paraQuem,
          }))}
        />
      )}
    </div>
  );
}
