/**
 * Bureau de crédito — a fonte que responde de verdade sobre capacidade de
 * pagamento, e a única que alcança pessoa física.
 *
 * Nenhum bureau publica API aberta: todos exigem contrato comercial com CNPJ e
 * cobram por consulta. Enquanto não houver contrato, este módulo se declara
 * indisponível e a auditoria diz claramente o que ficou sem verificar — em vez
 * de dar por boa uma capacidade que ninguém mediu.
 *
 * Escolha o fornecedor em BUREAU_PROVEDOR:
 *   "serasa"  → adaptador próprio, com autenticação OAuth2 do Serasa Experian
 *   qualquer outro → adaptador genérico (BigDataCorp, Direct Data, Assertiva...)
 */
import type { Apontamento, ResultadoFonte } from "../../tipos";
import { moeda } from "@/lib/formato";
import { adaptadorSerasa } from "./serasa";
import { adaptadorGenerico } from "./generico";
import type { AdaptadorBureau, LeituraBureau } from "./tipos";

export type { LeituraBureau } from "./tipos";

function escolherAdaptador(): AdaptadorBureau {
  const provedor = (process.env.BUREAU_PROVEDOR ?? "").trim().toLowerCase();
  if (provedor === "serasa" || provedor === "serasa experian") return adaptadorSerasa;
  return adaptadorGenerico;
}

// ---------------------------------------------------------------------
// Leitura dos números
// ---------------------------------------------------------------------

/**
 * Transforma a leitura em apontamentos.
 *
 * `valorOperacao` entra porque restrição é sempre relativa: R$ 40 mil de
 * protesto não significam a mesma coisa numa operação de R$ 90 mil e numa de
 * R$ 9 milhões.
 */
function apontar(leitura: LeituraBureau, provedor: string, valorOperacao: number | null): Apontamento[] {
  const apontamentos: Apontamento[] = [];
  const fonte = `Bureau de crédito (${provedor})`;

  const relevante = (valor: number | null) => {
    if (valor == null || valorOperacao == null || valorOperacao <= 0) return false;
    return valor >= valorOperacao * 0.1;
  };

  if (leitura.falencia) {
    apontamentos.push({
      gravidade: "GRAVE",
      eixo: "IDONEIDADE",
      titulo: "Falência registrada",
      detalhe: "Há registro de falência. A parte não dispõe livremente do próprio patrimônio.",
      fonte,
    });
  }

  if (leitura.recuperacaoJudicial) {
    apontamentos.push({
      gravidade: "GRAVE",
      eixo: "CAPACIDADE",
      titulo: "Em recuperação judicial",
      detalhe:
        "Pagamentos ficam sujeitos ao plano aprovado, e a cessão de ativo pode depender de autorização do juízo " +
        "da recuperação. Sem essa autorização, o negócio é anulável.",
      fonte,
    });
  }

  if (leitura.protestos && leitura.protestos > 0) {
    apontamentos.push({
      gravidade: leitura.protestos >= 3 || relevante(leitura.valorProtestos) ? "GRAVE" : "MEDIA",
      eixo: "CAPACIDADE",
      titulo: `${leitura.protestos} protesto(s) em cartório`,
      detalhe:
        `Protesto é dívida vencida e não paga, reconhecida em cartório` +
        (leitura.valorProtestos ? `, somando ${moeda(leitura.valorProtestos)}` : "") +
        ". É o sinal mais direto de dificuldade de pagamento.",
      fonte,
    });
  }

  if (leitura.pendenciasFinanceiras && leitura.pendenciasFinanceiras > 0) {
    apontamentos.push({
      gravidade:
        leitura.pendenciasFinanceiras >= 5 || relevante(leitura.valorPendencias) ? "GRAVE" : "MEDIA",
      eixo: "CAPACIDADE",
      titulo: `${leitura.pendenciasFinanceiras} pendência(s) financeira(s)`,
      detalhe:
        "Registros de inadimplência" +
        (leitura.valorPendencias ? `, somando ${moeda(leitura.valorPendencias)}` : "") +
        ". Compare o valor devido com o porte da parte antes de decidir.",
      fonte,
    });
  }

  if (leitura.dividaAtiva && leitura.dividaAtiva > 0) {
    apontamentos.push({
      gravidade: "GRAVE",
      eixo: "CAPACIDADE",
      titulo: "Inscrição em dívida ativa",
      detalhe:
        "Débito inscrito em dívida ativa" +
        (leitura.valorDividaAtiva ? ` de ${moeda(leitura.valorDividaAtiva)}` : "") +
        ". Num precatório isso é especialmente sério: a Fazenda pode compensar o débito contra o crédito a receber.",
      fonte,
    });
  }

  if (leitura.chequesSemFundo && leitura.chequesSemFundo > 0) {
    apontamentos.push({
      gravidade: "MEDIA",
      eixo: "CAPACIDADE",
      titulo: `${leitura.chequesSemFundo} cheque(s) sem fundo`,
      detalhe: "Registro no Cadastro de Emitentes de Cheques sem Fundos do Banco Central.",
      fonte,
    });
  }

  if (leitura.acoesJudiciais && leitura.acoesJudiciais > 0) {
    apontamentos.push({
      gravidade: relevante(leitura.valorAcoesJudiciais) ? "GRAVE" : "MEDIA",
      eixo: "IDONEIDADE",
      titulo: `${leitura.acoesJudiciais} ação(ões) judicial(is)`,
      detalhe:
        "Ações em curso contra a parte" +
        (leitura.valorAcoesJudiciais ? `, envolvendo ${moeda(leitura.valorAcoesJudiciais)}` : "") +
        ". Execuções podem levar à penhora do crédito antes que a cessão produza efeito — é o risco mais " +
        "concreto de perder o ativo depois de pagar.",
      fonte,
    });
  }

  if (leitura.score != null) {
    const maximo = leitura.scoreMaximo ?? 1000;
    const proporcao = leitura.score / maximo;

    if (proporcao < 0.3) {
      apontamentos.push({
        gravidade: "MEDIA",
        eixo: "CAPACIDADE",
        titulo: `Pontuação de crédito baixa (${leitura.score} de ${maximo})`,
        detalhe:
          "A pontuação é estatística e não substitui a análise dos números da operação, mas pesa na decisão de " +
          "exigir garantia ou pagamento à vista.",
        fonte,
      });
    } else if (proporcao >= 0.7) {
      apontamentos.push({
        gravidade: "INFO",
        eixo: "CAPACIDADE",
        titulo: `Pontuação de crédito alta (${leitura.score} de ${maximo})`,
        detalhe: "Histórico de crédito favorável segundo o bureau.",
        fonte,
      });
    }
  }

  // Faturamento presumido é o dado que realmente mede capacidade — melhor que
  // capital social, que é só o valor declarado na constituição.
  if (leitura.faturamentoPresumido != null && valorOperacao != null && valorOperacao > 0) {
    const proporcao = leitura.faturamentoPresumido / valorOperacao;
    if (proporcao < 0.5) {
      apontamentos.push({
        gravidade: "GRAVE",
        eixo: "CAPACIDADE",
        titulo: "Faturamento muito abaixo do valor da operação",
        detalhe:
          `Faturamento presumido de ${moeda(leitura.faturamentoPresumido)} ao ano para uma operação de ` +
          `${moeda(valorOperacao)}. Exija comprovação de recursos antes de qualquer assinatura.`,
        fonte,
      });
    } else {
      apontamentos.push({
        gravidade: "INFO",
        eixo: "CAPACIDADE",
        titulo: "Faturamento compatível com a operação",
        detalhe: `Faturamento presumido de ${moeda(leitura.faturamentoPresumido)} ao ano.`,
        fonte,
      });
    }
  }

  if (leitura.consultasUltimos90Dias != null && leitura.consultasUltimos90Dias >= 10) {
    apontamentos.push({
      gravidade: "MEDIA",
      eixo: "CAPACIDADE",
      titulo: `${leitura.consultasUltimos90Dias} consultas ao crédito em 90 dias`,
      detalhe:
        "Volume alto de consultas costuma indicar procura intensa por crédito no mercado — sinal de aperto de caixa.",
      fonte,
    });
  }

  return apontamentos;
}

// ---------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------

export async function consultarBureau(
  documento: string,
  tipo: "PF" | "PJ" = "PJ",
  valorOperacao: number | null = null
): Promise<ResultadoFonte & { leitura: LeituraBureau | null }> {
  const adaptador = escolherAdaptador();

  if (!adaptador.configurado()) {
    return {
      fonte: "BUREAU",
      status: "INDISPONIVEL",
      resumo: "Bureau de crédito não contratado — protestos e negativações não foram verificados.",
      apontamentos: [
        {
          gravidade: "MEDIA",
          eixo: "CAPACIDADE",
          titulo: "Restrições financeiras não verificadas",
          detalhe:
            "Sem contrato com um bureau, o sistema não enxerga protestos, pendências financeiras, dívida ativa, " +
            "ações judiciais nem recuperação judicial." +
            (tipo === "PF"
              ? " Para pessoa física isso é ainda mais limitante: não há base pública gratuita alguma."
              : " A capacidade foi estimada apenas pelo capital social da Receita, o que é indício, não prova.") +
            " Enquanto não houver contrato, exija da parte as certidões de protesto, de distribuição cível e a " +
            "certidão negativa de débitos.",
          fonte: "Bureau de crédito",
        },
      ],
      leitura: null,
    };
  }

  try {
    const { leitura, bruto } = await adaptador.consultar(documento, tipo);

    const restricoes =
      (leitura.protestos ?? 0) + (leitura.pendenciasFinanceiras ?? 0) + (leitura.dividaAtiva ?? 0);

    return {
      fonte: "BUREAU",
      status: "CONCLUIDA",
      resumo: restricoes > 0 ? `${restricoes} restrição(ões) encontrada(s).` : "Nenhuma restrição financeira encontrada.",
      resultado: { provedor: adaptador.nome, leitura, bruto },
      apontamentos: apontar(leitura, adaptador.nome, valorOperacao),
      leitura,
    };
  } catch (erro) {
    return {
      fonte: "BUREAU",
      status: "ERRO",
      resumo: `Consulta ao ${adaptador.nome} não concluída.`,
      erro: (erro as Error).message,
      apontamentos: [
        {
          gravidade: "MEDIA",
          eixo: "CAPACIDADE",
          titulo: "Bureau não respondeu",
          detalhe:
            `A consulta ao ${adaptador.nome} falhou: ${(erro as Error).message}. ` +
            "As restrições financeiras não foram verificadas nesta auditoria — repita antes de assinar.",
          fonte: "Bureau de crédito",
        },
      ],
      leitura: null,
    };
  }
}
