/**
 * Motor de verificação de garantias e avalistas da cédula de crédito rural.
 *
 * FONTES (verificadas em 15/09/2026, nenhuma de memória):
 *  - Decreto-Lei nº 167/67, art. 60, caput e § 2º: o caput manda aplicar à
 *    cédula de crédito rural, à nota promissória rural e à duplicata rural
 *    as normas de direito cambial quanto a aval; o § 2º, no entanto, é
 *    expresso ao restringir a NULIDADE do aval a só dois desses títulos:
 *    "É nulo o aval dado em Nota Promissória Rural ou Duplicata Rural, salvo
 *    quando dado pelas pessoas físicas participantes da empresa emitente ou
 *    por outras pessoas jurídicas." O § 3º estende a mesma nulidade a outras
 *    garantias reais ou pessoais dadas por quem não se enquadra nessa
 *    exceção. Texto conferido em modeloinicial.com.br/lei/DEL-167-1967 (art.
 *    60), que reproduz o Decreto-Lei — a Cédula de Crédito Rural, citada só
 *    no caput, NÃO está entre os títulos alcançados pela nulidade do § 2º.
 *    Por isso o motor exige o TIPO DO TÍTULO antes de aplicar esta regra:
 *    aplicá-la a uma cédula seria inventar uma nulidade que a lei não prevê
 *    para esse título.
 *  - Código Civil, arts. 421 e 422 (função social do contrato, boa-fé
 *    objetiva) e art. 478 (resolução por onerosidade excessiva) — mesmo
 *    fundamento já usado em `cobrancas.ts` para o que não depende da
 *    natureza consumerista da relação. Desproporção entre garantia exigida e
 *    valor da dívida não tem, aqui, um limite legal fixo — o CC não fixa
 *    percentual — então o motor SINALIZA a desproporção como ponto de
 *    atenção para o caso concreto, nunca como nulidade automática.
 *
 * Este é código determinístico, não IA: só decide o que os fatos confirmados
 * permitem decidir. Onde falta dado, o resultado é "INDETERMINADO".
 */

export type TipoTitulo = "CEDULA_CREDITO_RURAL" | "NOTA_PROMISSORIA_RURAL" | "DUPLICATA_RURAL" | "OUTRO";

export type Avalista = { nome: string; documento: string | null; patrimonioDescrito: string | null };

export type Gravidade = "CRITICO" | "ATENCAO" | "INFORMATIVO";
export type Alerta = { gravidade: Gravidade; titulo: string; texto: string; fonte: string };
export type ItemChecklist = { requisito: string; artigo: string; atende: boolean | "INDETERMINADO"; observacao: string };

export type FatosGarantias = {
  tipoTitulo: TipoTitulo | null;
  tiposGarantia: string[] | null;
  valorGarantia: number | null;
  valorOperacao: number | null;
  avalistas: Avalista[] | null;
};

export type ResultadoGarantias = {
  checklist: ItemChecklist[];
  alertas: Alerta[];
  /** Garantia dividida pela dívida, quando os dois valores existem. */
  razaoGarantiaSobreDivida: number | null;
};

const FONTE_ART60_CAPUT_E_2 = "Decreto-Lei nº 167/67, art. 60, caput e § 2º";
const FONTE_CC_ONEROSIDADE = "Código Civil, arts. 421, 422 e 478 (função social, boa-fé objetiva e onerosidade excessiva)";

/**
 * Acima disso a razão garantia/dívida é sinalizada como ponto de atenção —
 * critério de TRIAGEM deste sistema, não limite legal. O CC não fixa
 * percentual; o que sustenta a alegação de desequilíbrio é o caso concreto,
 * não este número sozinho.
 */
const RAZAO_DESPROPORCAO_ALERTA = 2;

function normalizar(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
}

/** Título alcançado pela nulidade do § 2º — só os dois que o parágrafo nomeia, não a cédula do caput. */
function tituloAlcancadoPeloArt60Par2(tipo: TipoTitulo | null): boolean {
  return tipo === "NOTA_PROMISSORIA_RURAL" || tipo === "DUPLICATA_RURAL";
}

export function analisarGarantiasEAvalistas(f: FatosGarantias): ResultadoGarantias {
  const checklist: ItemChecklist[] = [];
  const alertas: Alerta[] = [];

  // -------------------------------------------------------------------
  // 1. Proporção entre a garantia e o valor da operação
  // -------------------------------------------------------------------
  const razaoGarantiaSobreDivida =
    f.valorGarantia != null && f.valorOperacao != null && f.valorOperacao > 0 ? f.valorGarantia / f.valorOperacao : null;

  if (f.valorGarantia == null || f.valorOperacao == null) {
    checklist.push({
      requisito: "Garantia proporcional ao valor da operação",
      artigo: FONTE_CC_ONEROSIDADE,
      atende: "INDETERMINADO",
      observacao: "Informe o valor da garantia e o valor da operação para conferir a proporção entre os dois.",
    });
  } else {
    const desproporcional = razaoGarantiaSobreDivida! >= RAZAO_DESPROPORCAO_ALERTA;
    checklist.push({
      requisito: "Garantia proporcional ao valor da operação",
      artigo: FONTE_CC_ONEROSIDADE,
      atende: desproporcional ? "INDETERMINADO" : true,
      observacao: desproporcional
        ? `A garantia (${moeda(f.valorGarantia)}) vale ${razaoGarantiaSobreDivida!.toFixed(1)}x o valor da operação ` +
          `(${moeda(f.valorOperacao)}). Não há limite legal fixo no Código Civil — a desproporção, por si só, não ` +
          "anula nada; é indício a somar a outros elementos do caso para sustentar excesso de garantia."
        : `Garantia (${moeda(f.valorGarantia)}) compatível com o valor da operação (${moeda(f.valorOperacao)}).`,
    });

    if (desproporcional) {
      alertas.push({
        gravidade: "ATENCAO",
        titulo: "Possível excesso de garantia em relação à dívida",
        texto:
          `A garantia constituída (${moeda(f.valorGarantia)}) supera em ${razaoGarantiaSobreDivida!.toFixed(1)} vezes o ` +
          `valor da operação (${moeda(f.valorOperacao)}). O Código Civil não fixa um percentual máximo de garantia — ` +
          "o que sustenta a tese de excesso é a função social do contrato e a boa-fé objetiva (arts. 421 e 422), " +
          "eventualmente combinadas com a onerosidade excessiva do art. 478 se houver fato superveniente que " +
          "tenha alterado a base do negócio. Reúna elementos do caso concreto antes de levar este ponto à peça.",
        fonte: FONTE_CC_ONEROSIDADE,
      });
    }
  }

  // -------------------------------------------------------------------
  // 2. Aval nulo por força do art. 60, § 2º — só NPR e Duplicata Rural
  // -------------------------------------------------------------------
  const avalistas = f.avalistas ?? [];
  const haAval = avalistas.length > 0 || (f.tiposGarantia ?? []).some((t) => normalizar(t).includes("AVAL"));

  if (!haAval) {
    checklist.push({
      requisito: "Aval, quando houver, dado por quem a lei admite (Art. 60, § 2º, DL 167/67)",
      artigo: FONTE_ART60_CAPUT_E_2,
      atende: true,
      observacao: "Sem aval identificado entre as garantias.",
    });
  } else if (f.tipoTitulo == null) {
    checklist.push({
      requisito: "Aval, quando houver, dado por quem a lei admite (Art. 60, § 2º, DL 167/67)",
      artigo: FONTE_ART60_CAPUT_E_2,
      atende: "INDETERMINADO",
      observacao:
        "Há aval entre as garantias, mas falta informar o tipo do título (cédula, nota promissória rural ou " +
        "duplicata rural) — a regra de nulidade do § 2º só alcança os dois últimos, não a cédula.",
    });
  } else if (!tituloAlcancadoPeloArt60Par2(f.tipoTitulo)) {
    checklist.push({
      requisito: "Aval, quando houver, dado por quem a lei admite (Art. 60, § 2º, DL 167/67)",
      artigo: FONTE_ART60_CAPUT_E_2,
      atende: true,
      observacao: `O título é ${rotuloTitulo(f.tipoTitulo)} — a nulidade do § 2º não se aplica a ele, só a nota promissória rural e duplicata rural.`,
    });
  } else {
    checklist.push({
      requisito: "Aval, quando houver, dado por quem a lei admite (Art. 60, § 2º, DL 167/67)",
      artigo: FONTE_ART60_CAPUT_E_2,
      atende: "INDETERMINADO",
      observacao:
        `Título é ${rotuloTitulo(f.tipoTitulo)}: o § 2º considera NULO o aval dado por quem não é pessoa física ` +
        "participante da empresa emitente nem outra pessoa jurídica. Confira, avalista por avalista, se cada um se " +
        "enquadra nessa exceção — a lista está abaixo, se houver.",
    });

    alertas.push({
      gravidade: "ATENCAO",
      titulo: "Conferir se o(s) aval(es) é(são) válido(s) — Art. 60, § 2º, DL 167/67",
      texto:
        `O título deste contrato é ${rotuloTitulo(f.tipoTitulo)}. Nele, é NULO o aval dado por quem não é pessoa ` +
        "física participante da empresa emitente nem outra pessoa jurídica — o § 3º estende a mesma nulidade a " +
        "outras garantias reais ou pessoais dadas nessas condições. Se algum avalista listado for pessoa física " +
        "estranha ao negócio (cônjuge sem vínculo com a atividade, parente, terceiro), o aval dele é candidato a " +
        "nulidade de pleno direito, e a garantia correspondente pode cair." +
        (avalistas.length > 0
          ? ` Avalistas informados: ${avalistas.map((a) => a.nome).join(", ")}.`
          : ""),
      fonte: FONTE_ART60_CAPUT_E_2,
    });
  }

  return { checklist, alertas, razaoGarantiaSobreDivida };
}

function rotuloTitulo(t: TipoTitulo): string {
  const rotulos: Record<TipoTitulo, string> = {
    CEDULA_CREDITO_RURAL: "cédula de crédito rural",
    NOTA_PROMISSORIA_RURAL: "nota promissória rural",
    DUPLICATA_RURAL: "duplicata rural",
    OUTRO: "título não identificado no catálogo",
  };
  return rotulos[t];
}

function moeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
