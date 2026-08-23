/**
 * Calculadora de precatório.
 *
 * O QUE A LEI DIZ, E COMO ISSO VIRA CONTA
 *
 * A virada está na **EC 113/2021, art. 3º**: desde 9 de dezembro de 2021, nas
 * condenações contra a Fazenda Pública incide, "uma única vez, até o efetivo
 * pagamento", a **Selic acumulada mensalmente** — e ela cobre correção
 * monetária, remuneração do capital e mora, tudo junto. Nada mais se soma.
 *
 * Antes disso, o regime era outro:
 *   - correção monetária pelo **IPCA-E**, porque o STF afastou a TR da Lei
 *     11.960/2009 (ADI 4357 e 4425; RE 870947 — Tema 810);
 *   - **juros de mora** à parte, pelo índice da poupança nas relações não
 *     tributárias (0,5% ao mês enquanto a Selic passa de 8,5% ao ano), e pela
 *     própria Selic nas relações tributárias, caso em que ela já engloba tudo.
 *
 * Por isso o cálculo é feito em dois trechos, e o corte é 08/12/2021.
 *
 * Há ainda a **Súmula Vinculante 17**: no "período de graça" — entre a
 * apresentação do precatório até 2 de abril e o fim do exercício seguinte — não
 * correm juros de mora. Se ela sobrevive à Selic única da EC 113 é discussão
 * viva; por isso é opção na tela, marcada como controvertida, e não regra
 * silenciosa.
 *
 * NADA AQUI É PEDIDO À INTELIGÊNCIA ARTIFICIAL. Índice vem do Banco Central,
 * conta é feita em código, e cada linha do resultado mostra de onde saiu.
 */
import { carregarSerie, mesesEntre, nomeDoMes, percentualDoMes, SERIES } from "./indices";

/** Data em que a Selic única passou a valer (EC 113/2021, art. 3º). Em UTC. */
export const CORTE_EC113 = new Date("2021-12-09T00:00:00Z");

export type NaturezaRelacao = "TRIBUTARIA" | "NAO_TRIBUTARIA";

export type EntradaCalculo = {
  /** Valor apurado na conta de liquidação. */
  valorOriginal: number;
  /** Data a que o valor original se refere. */
  dataBase: Date;
  /** Até quando atualizar. */
  dataFinal: Date;
  /** Tributária usa Selic desde sempre; não tributária usa IPCA-E + juros até a EC 113. */
  natureza: NaturezaRelacao;
  /** Juros de mora ao mês, em %, no trecho anterior à EC 113. Padrão: 0,5%. */
  jurosMensalAntigo?: number;
  /** Data de apresentação do precatório ao tribunal, para o período de graça. */
  dataApresentacao?: Date | null;
  /** Ano orçamentário (LOA) em que o precatório está inscrito. */
  anoOrcamentario?: number | null;
  /** Aplicar a Súmula Vinculante 17 (sem juros no período de graça). */
  aplicarSumula17?: boolean;
};

export type LinhaCalculo = {
  ano: number;
  mes: number;
  regime: "IPCA_E_MAIS_JUROS" | "SELIC";
  indicePercentual: number | null;
  jurosPercentual: number;
  /** Se este mês caiu no período de graça e teve os juros afastados. */
  periodoDeGraca: boolean;
  saldo: number;
};

export type ResultadoCalculo = {
  valorOriginal: number;
  valorAtualizado: number;
  correcaoTotal: number;
  jurosTotal: number;
  /** Quanto o valor cresceu, em %. */
  variacaoPercentual: number;
  linhas: LinhaCalculo[];
  /** Meses em que o índice ainda não foi divulgado pelo Banco Central. */
  mesesSemIndice: string[];
  regimeAplicado: string[];
  /** Data-limite de pagamento conforme a LOA, quando informada. */
  prazoConstitucional: string | null;
  avisos: string[];
};

// ---------------------------------------------------------------------
// Atualização do valor
// ---------------------------------------------------------------------

export async function atualizarPrecatorio(entrada: EntradaCalculo): Promise<ResultadoCalculo> {
  const {
    valorOriginal,
    dataBase,
    dataFinal,
    natureza,
    jurosMensalAntigo = 0.5,
    dataApresentacao = null,
    anoOrcamentario = null,
    aplicarSumula17 = true,
  } = entrada;

  const [selic, ipcaE] = await Promise.all([
    carregarSerie(SERIES.SELIC),
    carregarSerie(SERIES.IPCA_E),
  ]);

  const linhas: LinhaCalculo[] = [];
  const mesesSemIndice: string[] = [];
  const regimeAplicado: string[] = [];
  const avisos: string[] = [];

  // ----- período de graça (SV 17) -----
  // Precatório apresentado até 2 de abril é pago até o fim do exercício
  // seguinte (CF, art. 100, § 5º). Nesse intervalo não correm juros de mora.
  let inicioGraca: Date | null = null;
  let fimGraca: Date | null = null;

  if (dataApresentacao && aplicarSumula17) {
    const anoApresentacao = dataApresentacao.getUTCFullYear();
    const limiteAbril = new Date(Date.UTC(anoApresentacao, 3, 2)); // 2 de abril
    const exercicioPagamento =
      dataApresentacao <= limiteAbril ? anoApresentacao + 1 : anoApresentacao + 2;

    inicioGraca = dataApresentacao;
    fimGraca = new Date(Date.UTC(exercicioPagamento, 11, 31));
  }

  const dentroDaGraca = (ano: number, mes: number) => {
    if (!inicioGraca || !fimGraca) return false;
    const referencia = new Date(Date.UTC(ano, mes - 1, 15));
    return referencia >= inicioGraca && referencia <= fimGraca;
  };

  // ----- percorre mês a mês -----
  let saldo = valorOriginal;
  let correcaoTotal = 0;
  let jurosTotal = 0;

  let usouRegimeAntigo = false;
  let usouSelic = false;

  for (const { ano, mes } of mesesEntre(dataBase, dataFinal)) {
    const referencia = new Date(Date.UTC(ano, mes - 1, 1));
    const antesDaEc113 = referencia < CORTE_EC113;

    // Relação tributária sempre usou Selic; a EC 113 estendeu isso a todas.
    const usaSelic = !antesDaEc113 || natureza === "TRIBUTARIA";

    if (usaSelic) {
      usouSelic = true;
      const indice = percentualDoMes(selic, ano, mes);

      if (indice == null) {
        mesesSemIndice.push(`${nomeDoMes(mes)}/${ano} (Selic)`);
        linhas.push({ ano, mes, regime: "SELIC", indicePercentual: null, jurosPercentual: 0, periodoDeGraca: false, saldo });
        continue;
      }

      const acrescimo = saldo * (indice / 100);
      saldo += acrescimo;
      // Na Selic única, correção e juros não se separam — a própria norma diz
      // que ela incide "uma única vez" para os dois fins.
      correcaoTotal += acrescimo;

      linhas.push({ ano, mes, regime: "SELIC", indicePercentual: indice, jurosPercentual: 0, periodoDeGraca: false, saldo });
      continue;
    }

    // ----- regime anterior: IPCA-E + juros de mora à parte -----
    usouRegimeAntigo = true;
    const indice = percentualDoMes(ipcaE, ano, mes);
    const naGraca = dentroDaGraca(ano, mes);
    const juros = naGraca ? 0 : jurosMensalAntigo;

    if (indice == null) {
      mesesSemIndice.push(`${nomeDoMes(mes)}/${ano} (IPCA-E)`);
    }

    const correcao = indice != null ? saldo * (indice / 100) : 0;
    saldo += correcao;
    correcaoTotal += correcao;

    // Juros simples sobre o valor já corrigido, mês a mês — é a forma usada nas
    // contas de liquidação da Fazenda.
    const acrescimoJuros = saldo * (juros / 100);
    saldo += acrescimoJuros;
    jurosTotal += acrescimoJuros;

    linhas.push({
      ano,
      mes,
      regime: "IPCA_E_MAIS_JUROS",
      indicePercentual: indice,
      jurosPercentual: juros,
      periodoDeGraca: naGraca,
      saldo,
    });
  }

  // ----- explicação do regime -----
  if (usouRegimeAntigo) {
    regimeAplicado.push(
      natureza === "TRIBUTARIA"
        ? "Até 08/12/2021, relação tributária: Selic (que já engloba correção e juros)."
        : `Até 08/12/2021: IPCA-E como correção monetária (STF, Tema 810) mais juros de mora de ${jurosMensalAntigo}% ao mês.`
    );
  }
  if (usouSelic) {
    regimeAplicado.push(
      "A partir de 09/12/2021: Selic acumulada mensalmente, uma única vez, cobrindo correção, remuneração do " +
        "capital e mora (EC 113/2021, art. 3º)."
    );
  }

  // ----- avisos -----
  if (inicioGraca && fimGraca) {
    const teveGraca = linhas.some((l) => l.periodoDeGraca);
    if (teveGraca) {
      regimeAplicado.push(
        `Juros de mora afastados entre ${inicioGraca.toLocaleDateString("pt-BR", { timeZone: "UTC" })} e ` +
          `${fimGraca.toLocaleDateString("pt-BR", { timeZone: "UTC" })} (Súmula Vinculante 17).`
      );
    }
    avisos.push(
      "A aplicação da Súmula Vinculante 17 depois da Selic única da EC 113/2021 é matéria controvertida: como a " +
        "Selic não separa correção de juros, há decisões nos dois sentidos. No trecho já sob Selic, o sistema não " +
        "afasta nada — só no trecho anterior."
    );
  }

  if (mesesSemIndice.length > 0) {
    avisos.push(
      `O Banco Central ainda não divulgou o índice de ${mesesSemIndice.length} mês(es): ` +
        `${mesesSemIndice.slice(0, 6).join(", ")}${mesesSemIndice.length > 6 ? "..." : ""}. ` +
        "Esses meses entraram sem correção, então o valor apurado está subestimado."
    );
  }

  let prazoConstitucional: string | null = null;
  if (anoOrcamentario) {
    prazoConstitucional =
      `Inscrito no orçamento de ${anoOrcamentario}: o pagamento deve ocorrer até 31/12/${anoOrcamentario} ` +
      "(CF, art. 100, § 5º), atualizado até a data do efetivo pagamento.";
  }

  return {
    valorOriginal,
    valorAtualizado: saldo,
    correcaoTotal,
    jurosTotal,
    variacaoPercentual: valorOriginal > 0 ? ((saldo - valorOriginal) / valorOriginal) * 100 : 0,
    linhas,
    mesesSemIndice,
    regimeAplicado,
    prazoConstitucional,
    avisos,
  };
}

// ---------------------------------------------------------------------
// Deduções sobre o valor bruto
// ---------------------------------------------------------------------

/**
 * Tabela progressiva mensal do imposto de renda.
 *
 * CONFIRA A VIGÊNCIA antes de usar em operação real: a tabela muda por lei e
 * por medida provisória, e uma faixa desatualizada erra o líquido do cliente.
 * Está isolada aqui de propósito, para ser trocada num lugar só.
 */
export const TABELA_IRRF = {
  vigenciaDeclarada: "maio/2025",
  faixas: [
    { ate: 2428.8, aliquota: 0, deduzir: 0 },
    { ate: 2826.65, aliquota: 7.5, deduzir: 182.16 },
    { ate: 3751.05, aliquota: 15, deduzir: 394.16 },
    { ate: 4664.68, aliquota: 22.5, deduzir: 675.49 },
    { ate: Infinity, aliquota: 27.5, deduzir: 908.73 },
  ],
};

export type EntradaDeducoes = {
  valorBruto: number;
  /** Parcela do valor que corresponde a juros de mora. */
  parcelaJuros: number;
  /** Alimentar sofre retenção; comum, em regra, não. */
  natureza: "ALIMENTAR" | "COMUM";
  /**
   * Número de meses a que se refere o valor acumulado (NM), para o regime de
   * Rendimentos Recebidos Acumuladamente — art. 12-A da Lei 7.713/1988.
   */
  mesesAcumulados: number;
  /** Afastar o IR sobre os juros de mora (STF, Tema 808). */
  jurosIsentosDeIr?: boolean;
  /**
   * Os honorários já saíram em requisitório próprio?
   *
   * Quando o advogado pede o destaque (art. 22, § 4º, da Lei 8.906/1994), o
   * tribunal expede requisitório separado em nome dele, e o precatório que
   * está sendo negociado JÁ SAI LÍQUIDO. Descontar de novo contaria duas vezes
   * e derrubaria o valor da operação sem motivo.
   */
  honorariosJaDestacados?: boolean;
  /** Percentual dos honorários contratuais, quando ainda houver o que deduzir. */
  honorariosContratuaisPercentual?: number;
  /** Honorários sucumbenciais destacados, em valor. */
  honorariosSucumbenciais?: number;
  /** Contribuição previdenciária retida, em valor. */
  contribuicaoPrevidenciaria?: number;
};

export type ResultadoDeducoes = {
  valorBruto: number;
  baseIr: number;
  irrf: number;
  aliquotaEfetiva: number;
  honorariosContratuais: number;
  honorariosSucumbenciais: number;
  contribuicaoPrevidenciaria: number;
  totalDeducoes: number;
  valorLiquido: number;
  explicacoes: string[];
};

export function calcularDeducoes(entrada: EntradaDeducoes): ResultadoDeducoes {
  const {
    valorBruto,
    parcelaJuros,
    natureza,
    mesesAcumulados,
    jurosIsentosDeIr = true,
    honorariosJaDestacados = false,
    honorariosContratuaisPercentual = 0,
    honorariosSucumbenciais = 0,
    contribuicaoPrevidenciaria = 0,
  } = entrada;

  const explicacoes: string[] = [];

  // ----- honorários -----
  // Se já houve destaque no requisitório, não há o que deduzir: o valor em
  // negociação é o do precatório do credor, e o do advogado já é outro papel.
  const honorariosContratuais = honorariosJaDestacados
    ? 0
    : valorBruto * (honorariosContratuaisPercentual / 100);

  if (honorariosJaDestacados) {
    explicacoes.push(
      "Honorários contratuais já destacados no ofício requisitório: o tribunal expediu requisitório próprio em " +
        "nome do advogado (art. 22, § 4º, da Lei 8.906/1994), e o valor aqui calculado já é o do credor. Nada a " +
        "deduzir — descontar de novo contaria a mesma verba duas vezes."
    );
  } else if (honorariosContratuais > 0) {
    explicacoes.push(
      `Honorários contratuais de ${honorariosContratuaisPercentual}% deduzidos do valor bruto. Como não houve ` +
        "destaque no requisitório, eles serão pagos dentro do mesmo precatório e saem do que o credor recebe."
    );
  }

  // ----- imposto de renda -----
  let baseIr = 0;
  let irrf = 0;

  if (natureza === "ALIMENTAR") {
    const meses = Math.max(1, Math.floor(mesesAcumulados));

    baseIr = valorBruto - honorariosContratuais - contribuicaoPrevidenciaria;

    if (jurosIsentosDeIr && parcelaJuros > 0) {
      // Proporcional: os honorários já retirados também reduziram a parcela de
      // juros, então descontamos a parte dela que sobrou na base.
      const proporcaoJuros = valorBruto > 0 ? parcelaJuros / valorBruto : 0;
      const jurosNaBase = baseIr * proporcaoJuros;
      baseIr -= jurosNaBase;

      explicacoes.push(
        `Juros de mora (${(proporcaoJuros * 100).toFixed(1)}% do valor) retirados da base do imposto: o STF fixou ` +
          "no Tema 808 que não incide imposto de renda sobre juros de mora pagos por atraso de remuneração."
      );
    }

    // Regime de rendimentos recebidos acumuladamente: a tabela mensal é
    // multiplicada pelo número de meses a que o valor se refere. Sem isso, um
    // atrasado de dez anos seria tributado como se fosse salário de um mês.
    const baseMensal = baseIr / meses;
    const faixa = TABELA_IRRF.faixas.find((f) => baseMensal <= f.ate) ?? TABELA_IRRF.faixas.at(-1)!;
    const impostoMensal = Math.max(0, baseMensal * (faixa.aliquota / 100) - faixa.deduzir);
    irrf = impostoMensal * meses;

    explicacoes.push(
      `Imposto de renda calculado pelo regime de rendimentos recebidos acumuladamente (art. 12-A da Lei ` +
        `7.713/1988): base de ${baseIr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} dividida ` +
        `por ${meses} meses, tributada pela tabela mensal (faixa de ${faixa.aliquota}%) e multiplicada de volta. ` +
        `Tabela vigente declarada: ${TABELA_IRRF.vigenciaDeclarada} — confira antes de usar.`
    );
  } else {
    explicacoes.push(
      "Precatório de natureza comum: sem retenção de imposto de renda na fonte pelo tribunal. A tributação, se " +
        "houver, segue a natureza do rendimento na declaração do credor."
    );
  }

  if (contribuicaoPrevidenciaria > 0) {
    explicacoes.push("Contribuição previdenciária retida conforme informado na conta de liquidação.");
  }

  const totalDeducoes = irrf + honorariosContratuais + honorariosSucumbenciais + contribuicaoPrevidenciaria;

  return {
    valorBruto,
    baseIr,
    irrf,
    aliquotaEfetiva: valorBruto > 0 ? (irrf / valorBruto) * 100 : 0,
    honorariosContratuais,
    honorariosSucumbenciais,
    contribuicaoPrevidenciaria,
    totalDeducoes,
    valorLiquido: valorBruto - totalDeducoes,
    explicacoes,
  };
}

// ---------------------------------------------------------------------
// A cessão em si
// ---------------------------------------------------------------------

export type EntradaCessao = {
  /** O que o credor efetivamente vai receber do tribunal. */
  valorLiquido: number;
  /** Deságio aplicado na compra, em %. */
  desagioPercentual: number;
  /** Comissões dos intermediários, em %, sobre o valor da cessão. */
  comissoesPercentual: number;
};

export type ResultadoCessao = {
  valorLiquido: number;
  valorCessao: number;
  desagioValor: number;
  comissoes: number;
  liquidoParaCedente: number;
  /** Quanto o comprador ganha se receber o valor integral. */
  ganhoBrutoComprador: number;
  /** Retorno sobre o desembolso, em %. */
  retornoPercentual: number;
};

export function calcularCessao(entrada: EntradaCessao): ResultadoCessao {
  const { valorLiquido, desagioPercentual, comissoesPercentual } = entrada;

  const desagioValor = valorLiquido * (desagioPercentual / 100);
  const valorCessao = valorLiquido - desagioValor;
  const comissoes = valorCessao * (comissoesPercentual / 100);

  return {
    valorLiquido,
    valorCessao,
    desagioValor,
    comissoes,
    liquidoParaCedente: valorCessao - comissoes,
    ganhoBrutoComprador: valorLiquido - valorCessao,
    retornoPercentual: valorCessao > 0 ? ((valorLiquido - valorCessao) / valorCessao) * 100 : 0,
  };
}
