/**
 * Motor de verificação de taxas e encargos da cédula de crédito rural:
 * comparação com a taxa média do Banco Central e conformidade com o
 * Decreto-Lei nº 167/67.
 *
 * FONTES (todas verificadas em 09/09/2026, nenhuma de memória):
 *  - Decreto-Lei nº 167/67, art. 5º e parágrafo único (juros e capitalização;
 *    mora eleva a taxa em até 1% ao ano) e art. 71, redação da Lei nº
 *    13.986/2020 (multa de até 2% sobre principal e acessórios em débito,
 *    em caso de cobrança) — texto oficial atualizado, Câmara dos Deputados
 *    (www2.camara.leg.br/legin).
 *  - Súmula 93/STJ (Segunda Seção, 27/10/1993): "A legislação sobre cédulas
 *    de crédito rural, comercial e industrial admite o pacto de
 *    capitalização de juros." — inclusive periodicidade mensal, quando
 *    pactuada (REsp 13.098-GO, Segunda Seção, 29/04/1992, DJ 22/06/1992,
 *    específico sobre crédito rural e art. 5º do DL 167/67) — texto oficial,
 *    stj.jus.br.
 *  - Súmula 30/STJ: "A comissão de permanência e a correção monetária são
 *    inacumuláveis."
 *  - Taxa média de mercado: API de Séries Temporais (SGS) do Banco Central,
 *    consultada ao vivo a cada análise (ver `bcb.ts`) — nunca estimada.
 *
 * Este é código determinístico, não IA: só decide o que os fatos confirmados
 * permitem decidir, e cita o artigo/súmula exatos para o advogado conferir.
 * Onde falta dado, o resultado é "INDETERMINADO" — nunca um valor supondo.
 *
 * IMPORTANTE: os limiares de "quantos pontos percentuais acima da média já
 * chamam atenção" (abaixo) são um critério de TRIAGEM deste sistema, não um
 * limite legal — a peça precisa apoiar a alegação de abusividade em outros
 * elementos do caso, não só nesse número.
 */
import type { TaxaMediaBcb } from "./bcb";

export type PeriodicidadeCapitalizacao = "MENSAL" | "SEMESTRAL" | "ANUAL" | "OUTRA";

export type FatosTaxas = {
  mutuarioDocumento: string | null;
  taxaJurosContratual: number | null;
  temClausulaCapitalizacao: boolean | null;
  periodicidadeCapitalizacao: PeriodicidadeCapitalizacao | null;
  multaMoratoriaPercentual: number | null;
  temComissaoPermanencia: boolean | null;
  comissaoPermanenciaCumulada: boolean | null;
};

export type Gravidade = "CRITICO" | "ATENCAO" | "INFORMATIVO";
export type Alerta = { gravidade: Gravidade; titulo: string; texto: string; fonte: string };
export type ItemChecklist = { requisito: string; artigo: string; atende: boolean | "INDETERMINADO"; observacao: string };

export type ResultadoTaxas = {
  ehPessoaJuridica: boolean | "INDETERMINADO";
  taxaMediaBcb: TaxaMediaBcb | null;
  diferencaPontosPercentuais: number | null;
  classificacaoTaxa: "DENTRO_OU_ABAIXO_DA_MEDIA" | "ACIMA_DA_MEDIA" | "MUITO_ACIMA_DA_MEDIA" | "INDETERMINADO";
  checklist: ItemChecklist[];
  alertas: Alerta[];
};

const FONTE_DL167_ART5 = "Decreto-Lei nº 167/67, art. 5º e parágrafo único";
const FONTE_DL167_ROL_ENCARGOS = "Decreto-Lei nº 167/67, arts. 5º, 8º e 71";
const FONTE_DL167_ART71 = "Decreto-Lei nº 167/67, art. 71 (redação da Lei nº 13.986/2020)";
const FONTE_SUMULA_93 = "Súmula 93/STJ (2ª Seção, 27/10/1993); REsp 13.098-GO (2ª Seção, 29/04/1992, DJ 22/06/1992)";
const FONTE_SUMULA_30 = "Súmula 30/STJ";

/** A partir de quantos pontos percentuais acima da média já vale um alerta — e um alerta grave. Ver nota no cabeçalho do arquivo. */
const LIMIAR_ACIMA_MEDIA = 2;
const LIMIAR_MUITO_ACIMA_MEDIA = 5;

function inferirPessoaJuridica(documento: string | null): boolean | "INDETERMINADO" {
  if (!documento) return "INDETERMINADO";
  const digitos = documento.replace(/\D/g, "");
  if (digitos.length === 14) return true;
  if (digitos.length === 11) return false;
  return "INDETERMINADO";
}

export function analisarTaxasEEncargos(f: FatosTaxas, taxaMediaBcb: TaxaMediaBcb | null): ResultadoTaxas {
  const checklist: ItemChecklist[] = [];
  const alertas: Alerta[] = [];

  const ehPessoaJuridica = inferirPessoaJuridica(f.mutuarioDocumento);

  // -------------------------------------------------------------------
  // 1. Comparação com a taxa média do Banco Central
  // -------------------------------------------------------------------
  let diferencaPontosPercentuais: number | null = null;
  let classificacaoTaxa: ResultadoTaxas["classificacaoTaxa"] = "INDETERMINADO";

  if (f.taxaJurosContratual !== null && taxaMediaBcb) {
    diferencaPontosPercentuais = Number((f.taxaJurosContratual - taxaMediaBcb.valor).toFixed(2));

    if (diferencaPontosPercentuais >= LIMIAR_MUITO_ACIMA_MEDIA) {
      classificacaoTaxa = "MUITO_ACIMA_DA_MEDIA";
      alertas.push({
        gravidade: "CRITICO",
        titulo: "Taxa contratual muito acima da média do Banco Central",
        texto:
          `A taxa contratada (${f.taxaJurosContratual}% a.a.) está ${diferencaPontosPercentuais.toFixed(2)} pontos ` +
          `percentuais acima da taxa média do crédito rural com taxas reguladas divulgada pelo Banco Central ` +
          `(${taxaMediaBcb.valor}% a.a., referência ${taxaMediaBcb.periodoReferencia}). A distância expressiva é ` +
          "indício de abusividade a examinar junto ao extrato de evolução da dívida e à origem dos recursos " +
          "(taxas reguladas ou livres).",
        fonte: taxaMediaBcb.fonte,
      });
    } else if (diferencaPontosPercentuais >= LIMIAR_ACIMA_MEDIA) {
      classificacaoTaxa = "ACIMA_DA_MEDIA";
      alertas.push({
        gravidade: "ATENCAO",
        titulo: "Taxa contratual acima da média do Banco Central",
        texto:
          `A taxa contratada (${f.taxaJurosContratual}% a.a.) está ${diferencaPontosPercentuais.toFixed(2)} pontos ` +
          `percentuais acima da taxa média do crédito rural com taxas reguladas divulgada pelo Banco Central ` +
          `(${taxaMediaBcb.valor}% a.a., referência ${taxaMediaBcb.periodoReferencia}). Vale conferir se a operação ` +
          "é de recursos controlados ou livres, e a origem exata da taxa cobrada, antes de qualificar como abusiva.",
        fonte: taxaMediaBcb.fonte,
      });
    } else {
      classificacaoTaxa = "DENTRO_OU_ABAIXO_DA_MEDIA";
    }

    checklist.push({
      requisito: "Taxa de juros contratual comparada à taxa média do Banco Central para crédito rural",
      artigo: `SGS/BCB, série ${taxaMediaBcb.serie}`,
      atende: diferencaPontosPercentuais < LIMIAR_ACIMA_MEDIA,
      observacao:
        classificacaoTaxa === "DENTRO_OU_ABAIXO_DA_MEDIA"
          ? "Taxa dentro ou abaixo da média de mercado do Banco Central."
          : `Taxa ${diferencaPontosPercentuais.toFixed(2)} pontos percentuais acima da média — ver alerta.`,
    });
  } else {
    checklist.push({
      requisito: "Taxa de juros contratual comparada à taxa média do Banco Central para crédito rural",
      artigo: "Referência: SGS/BCB",
      atende: "INDETERMINADO",
      observacao: !taxaMediaBcb
        ? "Não foi possível consultar a taxa média do Banco Central no momento da análise."
        : "Informe a taxa de juros contratual para comparar com a taxa média do Banco Central.",
    });
  }

  // -------------------------------------------------------------------
  // 2. Capitalização de juros (DL 167/67, art. 5º; Súmula 93/STJ)
  // -------------------------------------------------------------------
  if (f.temClausulaCapitalizacao === null) {
    checklist.push({
      requisito: "Capitalização de juros expressamente pactuada",
      artigo: FONTE_DL167_ART5,
      atende: "INDETERMINADO",
      observacao: "Confirme, no contrato, se há cláusula expressa de capitalização de juros e a periodicidade pactuada.",
    });
  } else if (f.temClausulaCapitalizacao === false) {
    checklist.push({
      requisito: "Capitalização de juros expressamente pactuada",
      artigo: FONTE_DL167_ART5,
      atende: true,
      observacao:
        "Sem cláusula de capitalização — juros simples. Se o banco estiver cobrando juros capitalizados mesmo " +
        "assim, a cobrança carece de amparo contratual.",
    });
  } else {
    checklist.push({
      requisito: "Capitalização de juros expressamente pactuada",
      artigo: FONTE_SUMULA_93,
      atende: true,
      observacao: f.periodicidadeCapitalizacao
        ? `Capitalização pactuada com periodicidade ${f.periodicidadeCapitalizacao.toLowerCase()} — válida, desde ` +
          "que expressa no título (Súmula 93/STJ; para periodicidade mensal em crédito rural, especificamente, " +
          "REsp 13.098-GO)."
        : "Há cláusula de capitalização, mas falta confirmar a periodicidade pactuada no título.",
    });
    if (!f.periodicidadeCapitalizacao) {
      alertas.push({
        gravidade: "ATENCAO",
        titulo: "Periodicidade da capitalização não confirmada",
        texto:
          "Há cláusula de capitalização de juros, mas a periodicidade pactuada no título ainda não foi informada. " +
          "Sem essa confirmação, não dá para conferir se o banco está capitalizando exatamente como consta na cédula.",
        fonte: FONTE_SUMULA_93,
      });
    }
  }

  // -------------------------------------------------------------------
  // 3. Multa moratória (DL 167/67, art. 71 — limite de 2%)
  // -------------------------------------------------------------------
  if (f.multaMoratoriaPercentual === null) {
    checklist.push({
      requisito: "Multa moratória dentro do limite de 2% sobre principal e acessórios em débito",
      artigo: FONTE_DL167_ART71,
      atende: "INDETERMINADO",
      observacao: "Informe o percentual de multa moratória previsto no contrato.",
    });
  } else {
    const dentroDoLimite = f.multaMoratoriaPercentual <= 2;
    checklist.push({
      requisito: "Multa moratória dentro do limite de 2% sobre principal e acessórios em débito",
      artigo: FONTE_DL167_ART71,
      atende: dentroDoLimite,
      observacao: dentroDoLimite
        ? "Multa moratória dentro do limite legal de 2%."
        : `Multa contratada de ${f.multaMoratoriaPercentual}% excede o limite de 2% do art. 71 do Decreto-Lei nº ` +
          "167/67 — o que exceder esse percentual carece de amparo legal.",
    });
    if (!dentroDoLimite) {
      alertas.push({
        gravidade: "CRITICO",
        titulo: "Multa moratória acima do limite legal",
        texto:
          `A cédula prevê multa de ${f.multaMoratoriaPercentual}% em caso de cobrança, mas o art. 71 do ` +
          "Decreto-Lei nº 167/67 (redação da Lei nº 13.986/2020) limita essa multa a até 2% sobre o principal e " +
          "acessórios em débito. O que exceder esse percentual pode ser impugnado.",
        fonte: FONTE_DL167_ART71,
      });
    }
  }

  // -------------------------------------------------------------------
  // 4. Comissão de permanência (Súmula 30/STJ; rol taxativo do DL 167/67)
  // -------------------------------------------------------------------
  if (f.temComissaoPermanencia === true) {
    checklist.push({
      requisito: "Comissão de permanência não cumulada com correção monetária ou juros remuneratórios",
      artigo: FONTE_SUMULA_30,
      atende: f.comissaoPermanenciaCumulada === true ? false : f.comissaoPermanenciaCumulada === false ? true : "INDETERMINADO",
      observacao:
        f.comissaoPermanenciaCumulada === true
          ? "Comissão de permanência cumulada com correção monetária ou juros — cobrança vedada pela Súmula 30/STJ."
          : f.comissaoPermanenciaCumulada === false
            ? "Comissão de permanência informada como não cumulada — confira ainda se há amparo contratual " +
              "específico para essa cobrança na cédula."
            : "Confirme se a comissão de permanência está sendo cumulada com correção monetária e/ou juros remuneratórios.",
    });
    alertas.push({
      gravidade: "ATENCAO",
      titulo: "Cobrança de comissão de permanência na cédula de crédito rural",
      texto:
        "O Decreto-Lei nº 167/67 lista os encargos cobráveis na cédula de crédito rural: juros do art. 5º, comissão " +
        "de fiscalização do art. 8º, e multa do art. 71. Comissão de permanência não consta desse rol — vale " +
        "examinar se há amparo contratual específico para essa cobrança, além de conferir a cumulação vedada pela " +
        "Súmula 30/STJ.",
      fonte: FONTE_DL167_ROL_ENCARGOS,
    });
    if (f.comissaoPermanenciaCumulada === true) {
      alertas.push({
        gravidade: "CRITICO",
        titulo: "Comissão de permanência cumulada — cobrança vedada",
        texto:
          "A Súmula 30 do Superior Tribunal de Justiça veda a cumulação da comissão de permanência com a correção " +
          "monetária. Se também houver cumulação com juros remuneratórios, há entendimento do STJ que agrava ainda " +
          "mais o vício — vale pesquisar jurisprudência atualizada sobre esse ponto específico antes de levar à peça.",
        fonte: FONTE_SUMULA_30,
      });
    }
  } else if (f.temComissaoPermanencia === null) {
    checklist.push({
      requisito: "Comissão de permanência não cumulada com correção monetária ou juros remuneratórios",
      artigo: FONTE_SUMULA_30,
      atende: "INDETERMINADO",
      observacao: "Confirme se o contrato prevê cobrança de comissão de permanência.",
    });
  } else {
    checklist.push({
      requisito: "Comissão de permanência não cumulada com correção monetária ou juros remuneratórios",
      artigo: FONTE_SUMULA_30,
      atende: true,
      observacao: "Sem comissão de permanência identificada.",
    });
  }

  return {
    ehPessoaJuridica,
    taxaMediaBcb,
    diferencaPontosPercentuais,
    classificacaoTaxa,
    checklist,
    alertas,
  };
}
