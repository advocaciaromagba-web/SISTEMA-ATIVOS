/**
 * Motor de verificação do seguro rural / Proagro do contrato.
 *
 * FONTES (verificadas em 15/09/2026):
 *  - Obrigatoriedade do Proagro em custeio agrícola: confirmada em múltiplas
 *    fontes secundárias convergentes (sistemafaep.org.br, ABPM, escritórios
 *    especializados em direito agrário) — o custeio agrícola de até R$
 *    300.000,00, com cultivo amparado pelo Zoneamento Agrícola de Risco
 *    Climático (ZARC) e recursos controlados, tem adesão OBRIGATÓRIA ao
 *    Proagro (Resolução CMN nº 4.509/2016; formalização por cláusula no
 *    próprio título, MCR item 12-2-20). Contratar seguro agrícola privado
 *    dispensa a obrigatoriedade. **A tentativa de conferir o texto
 *    diretamente no Manual de Crédito Rural do Banco Central (mcr.bcb.gov.br)
 *    falhou nesta sessão — o site redirecionou para a página inicial. Esta
 *    regra está apoiada só em fonte secundária; confira o texto vigente do
 *    MCR (capítulo 16, Proagro) antes de usar este ponto na peça.**
 *  - Código Civil, art. 757 e seguintes (contrato de seguro) — a cobertura
 *    só vigora dentro do período da apólice; sinistro fora da vigência não é
 *    coberto. É lógica do próprio contrato de seguro, não precedente.
 *
 * Este é código determinístico, não IA. Onde falta dado, "INDETERMINADO".
 * Nada aqui decide se a perda de safra está ou não provada — isso é o motor
 * de perdas de safra, dentro de `mp1376.ts`. Este módulo só confronta o que
 * já foi informado sobre o seguro com o resto do que já foi informado sobre
 * o contrato — coerência interna, não descoberta de fato novo.
 */

export type Gravidade = "CRITICO" | "ATENCAO" | "INFORMATIVO";
export type Alerta = { gravidade: Gravidade; titulo: string; texto: string; fonte: string };
export type ItemChecklist = { requisito: string; artigo: string; atende: boolean | "INDETERMINADO"; observacao: string };

export type FatosSeguroRural = {
  categoriaOperacao: "CUSTEIO" | "INVESTIMENTO" | "COMERCIALIZACAO" | "INDUSTRIALIZACAO" | null;
  valorOperacao: number | null;
  temSeguroRural: boolean | null;
  temProagro: boolean | null;
  vigenciaInicio: Date | null;
  vigenciaFim: Date | null;
  indenizacaoRecebida: number | null;
  /** Quando o contrato alega perda de safra, para confrontar com a vigência e a indenização. */
  numeroSafrasComPerda: number | null;
  percentualReducaoRenda: number | null;
};

export type ResultadoSeguroRural = {
  checklist: ItemChecklist[];
  alertas: Alerta[];
};

const FONTE_PROAGRO_OBRIGATORIO =
  "Resolução CMN nº 4.509/2016 e MCR, item 12-2-20 (fonte secundária — texto do MCR não conferido nesta sessão)";
const FONTE_CC_SEGURO = "Código Civil, art. 757 e seguintes (contrato de seguro)";

/** Limite de custeio agrícola com adesão obrigatória ao Proagro, quando não há seguro privado. */
const LIMITE_PROAGRO_OBRIGATORIO = 300_000;

export function analisarSeguroRural(f: FatosSeguroRural): ResultadoSeguroRural {
  const checklist: ItemChecklist[] = [];
  const alertas: Alerta[] = [];

  // -------------------------------------------------------------------
  // 1. Obrigatoriedade do Proagro em custeio de até R$ 300 mil
  // -------------------------------------------------------------------
  if (f.categoriaOperacao === "CUSTEIO" && f.valorOperacao != null) {
    if (f.valorOperacao <= LIMITE_PROAGRO_OBRIGATORIO) {
      const coberto = f.temProagro === true || f.temSeguroRural === true;
      checklist.push({
        requisito: "Custeio de até R$ 300 mil coberto por Proagro ou seguro agrícola privado",
        artigo: FONTE_PROAGRO_OBRIGATORIO,
        atende: coberto ? true : f.temProagro === null && f.temSeguroRural === null ? "INDETERMINADO" : false,
        observacao: coberto
          ? "Cobertura presente (Proagro ou seguro privado)."
          : f.temProagro === null && f.temSeguroRural === null
            ? "Informe se há Proagro ou seguro agrícola privado — custeio até R$ 300 mil tem adesão obrigatória a " +
              "um dos dois (fonte secundária, conferir texto do MCR)."
            : "Custeio de até R$ 300 mil sem Proagro nem seguro agrícola privado identificado. Se o cultivo era " +
              "amparado pelo ZARC e os recursos eram controlados, a adesão era obrigatória — confira se a " +
              "instituição financeira cumpriu o dever de formalizar a cláusula (MCR 12-2-20) antes de imputar a " +
              "falta ao produtor.",
      });

      if (!coberto && f.temProagro === false && f.temSeguroRural === false) {
        alertas.push({
          gravidade: "ATENCAO",
          titulo: "Custeio sem Proagro nem seguro agrícola, abaixo do limite de obrigatoriedade",
          texto:
            "Operação de custeio de até R$ 300 mil, sem Proagro nem seguro agrícola privado. Segundo fonte " +
            "secundária (não conferida no MCR original nesta sessão), a adesão ao Proagro é obrigatória nessa " +
            "faixa quando o cultivo é amparado pelo ZARC e os recursos são controlados — a instituição financeira " +
            "tem o dever de formalizar a cláusula no próprio título. A ausência de cobertura pode ser falha da " +
            "instituição, não do produtor. Confira o texto vigente do MCR (capítulo 16) antes de usar este ponto.",
          fonte: FONTE_PROAGRO_OBRIGATORIO,
        });
      }
    } else {
      checklist.push({
        requisito: "Custeio de até R$ 300 mil coberto por Proagro ou seguro agrícola privado",
        artigo: FONTE_PROAGRO_OBRIGATORIO,
        atende: true,
        observacao: `Operação de ${moeda(f.valorOperacao)} está acima do limite de R$ 300 mil — sem adesão obrigatória por este critério.`,
      });
    }
  } else if (f.categoriaOperacao === "CUSTEIO") {
    checklist.push({
      requisito: "Custeio de até R$ 300 mil coberto por Proagro ou seguro agrícola privado",
      artigo: FONTE_PROAGRO_OBRIGATORIO,
      atende: "INDETERMINADO",
      observacao: "Informe o valor da operação para conferir se está dentro do limite de obrigatoriedade.",
    });
  }

  // -------------------------------------------------------------------
  // 2. Vigência da apólice x período em que a perda foi alegada
  // -------------------------------------------------------------------
  if (f.temSeguroRural === true && (f.numeroSafrasComPerda ?? 0) > 0) {
    if (!f.vigenciaInicio || !f.vigenciaFim) {
      checklist.push({
        requisito: "Vigência da apólice compatível com o período da perda alegada",
        artigo: FONTE_CC_SEGURO,
        atende: "INDETERMINADO",
        observacao: "Há alegação de perda de safra e seguro contratado, mas faltam as datas de início/fim de vigência da apólice.",
      });
    } else {
      checklist.push({
        requisito: "Vigência da apólice compatível com o período da perda alegada",
        artigo: FONTE_CC_SEGURO,
        atende: "INDETERMINADO",
        observacao:
          `Apólice vigente de ${dataBr(f.vigenciaInicio)} a ${dataBr(f.vigenciaFim)}. Confirme se a(s) safra(s) ` +
          "com perda alegada caem dentro desse período — sinistro fora da vigência não é coberto pela apólice " +
          "(mas isso não afeta o enquadramento na MP 1.376, que não exige seguro).",
      });
    }
  }

  // -------------------------------------------------------------------
  // 3. Indenização já recebida x percentual de redução de renda alegado
  // -------------------------------------------------------------------
  if (f.indenizacaoRecebida != null && f.indenizacaoRecebida > 0) {
    alertas.push({
      gravidade: "INFORMATIVO",
      titulo: "Indenização de seguro já recebida — reconciliar com a perda alegada",
      texto:
        `O produtor já recebeu ${moeda(f.indenizacaoRecebida)} de indenização do seguro rural/Proagro. Isso não ` +
        "afeta o enquadramento na MP nº 1.376/2026, que não condiciona a composição da dívida ao recebimento ou " +
        "não de indenização — mas é elemento a levar em conta na análise de capacidade de pagamento e na " +
        "negociação com a instituição financeira, para não haver dupla contagem da mesma perda.",
      fonte: FONTE_CC_SEGURO,
    });
  }

  return { checklist, alertas };
}

function dataBr(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

function moeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
