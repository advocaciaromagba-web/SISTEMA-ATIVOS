/**
 * Motor de verificação de venda casada (seguro ou produto vinculado ao
 * crédito) e de tarifas cobradas do produtor rural.
 *
 * FONTES (todas verificadas em 10/09/2026, nenhuma de memória):
 *  - CDC (Lei nº 8.078/90), art. 39, I: veda condicionar o fornecimento de
 *    produto/serviço ao fornecimento de outro — texto conferido em múltiplas
 *    bases de legislação convergentes.
 *  - Tema 972/STJ (REsp 1.639.320/SP e REsp 1.639.259/SP, 2ª Seção, julgado
 *    em 12/12/2018, trânsito em julgado 20/02/2019) — tese 2: "o consumidor
 *    não pode ser compelido a contratar seguro com a instituição financeira
 *    ou com seguradora por ela indicada"; tese 1: tarifa de registro de
 *    gravame é abusiva em contratos celebrados a partir de 25/02/2011
 *    (vigência da Resolução CMN nº 3.954/2011) — texto oficial conferido na
 *    página de precedentes qualificados do STJ (processo.stj.jus.br).
 *  - REsp 1.874.910/DF: aplica o Tema 972 especificamente a um caso de
 *    crédito rural (seguro de penhor rural vinculado ao financiador, sem
 *    opção de escolha de seguradora) — identificado só em fonte secundária
 *    (notícias de imprensa jurídica) nesta sessão; o inteiro teor não foi
 *    conferido na fonte oficial do STJ, e a peça deve avisar disso.
 *  - Súmula 565/STJ: a pactuação de TAC/TEC (tarifa de abertura de crédito
 *    / tarifa de emissão de carnê), ou outra denominação para o mesmo fato
 *    gerador, só é válida em contratos anteriores à vigência da Resolução
 *    CMN nº 3.518/2007, em 30/04/2008.
 *  - Súmula 566/STJ: em contratos posteriores a 30/04/2008, a tarifa de
 *    cadastro só pode ser cobrada no início do relacionamento entre o
 *    cliente e a instituição financeira.
 *  - Código Civil, arts. 187, 421 e 422 (abuso de direito, função social do
 *    contrato, boa-fé objetiva) — fundamento que não depende de a relação
 *    ser ou não de consumo, e por isso serve de base mesmo quando o crédito
 *    rural não se qualificar como relação consumerista.
 *
 * Este é código determinístico, não IA: só decide o que os fatos confirmados
 * permitem decidir, e cita o artigo/súmula/tema exatos para o advogado
 * conferir. Onde falta dado, o resultado é "INDETERMINADO".
 *
 * IMPORTANTE: o crédito rural para atividade produtiva, em regra, não atrai
 * o CDC pela teoria finalista do STJ (salvo vulnerabilidade caracterizada —
 * finalismo aprofundado). Por isso todo alerta que se apoie no CDC ou no
 * Tema 972 vem acompanhado do fundamento autônomo do Código Civil, que não
 * depende dessa qualificação — e de aviso expresso para o advogado conferir
 * a natureza da relação antes de invocar o CDC na peça.
 */

export type Gravidade = "CRITICO" | "ATENCAO" | "INFORMATIVO";
export type Alerta = { gravidade: Gravidade; titulo: string; texto: string; fonte: string };
export type ItemChecklist = { requisito: string; artigo: string; atende: boolean | "INDETERMINADO"; observacao: string };

export type FatosCobrancas = {
  dataContratacao: Date | null;
  creditoCondicionadoASeguroOuProduto: boolean | null;
  seguroOuProdutoVinculadoMesmoGrupo: boolean | null;
  houveOpcaoDeEscolhaOuRecusa: boolean | null;
  descricaoProdutoVinculado: string | null;
  temTarifaAberturaCreditoOuEmissaoCarne: boolean | null;
  temTarifaCadastro: boolean | null;
  tarifaCadastroCobradaApenasNoInicio: boolean | null;
  temTarifaRegistroGravame: boolean | null;
};

export type ResultadoCobrancas = {
  checklist: ItemChecklist[];
  alertas: Alerta[];
};

const FONTE_CDC_39 = "CDC (Lei nº 8.078/90), art. 39, I";
const FONTE_TEMA_972_TESE2 = "Tema 972/STJ, tese 2 (REsp 1.639.320/SP e REsp 1.639.259/SP, 2ª Seção, j. 12/12/2018)";
const FONTE_TEMA_972_TESE1 = "Tema 972/STJ, tese 1 (Resolução CMN nº 3.954/2011)";
const FONTE_RESP_CREDITO_RURAL =
  "REsp 1.874.910/DF (aplicação do Tema 972/STJ a seguro vinculado ao crédito rural — identificado só em fonte " +
  "secundária nesta análise; confira o inteiro teor no site do STJ antes de citar)";
const FONTE_CC_ABUSO = "Código Civil, arts. 187, 421 e 422 (abuso de direito, função social do contrato e boa-fé objetiva)";
const FONTE_SUMULA_565 = "Súmula 565/STJ";
const FONTE_SUMULA_566 = "Súmula 566/STJ";
const AVISO_NATUREZA_CONSUMERISTA =
  "Confira se a relação se qualifica como consumerista antes de invocar o CDC ou o Tema 972/STJ na peça — crédito " +
  "tomado para atividade produtiva, em regra, não atrai o CDC pela teoria finalista do STJ, salvo vulnerabilidade " +
  "caracterizada (finalismo aprofundado). O fundamento do Código Civil (abuso de direito, boa-fé objetiva) não " +
  "depende dessa qualificação.";

/** Vigência da Resolução CMN nº 3.518/2007 — marco da Súmula 565/STJ (TAC/TEC) e dos Temas 618/619/STJ. */
const VIGENCIA_RESOLUCAO_3518 = new Date("2008-04-30T00:00:00-03:00");
/** Vigência da Resolução CMN nº 3.954/2011 — marco da tese 1 do Tema 972/STJ (tarifa de registro de gravame). */
const VIGENCIA_RESOLUCAO_3954 = new Date("2011-02-25T00:00:00-03:00");

export function analisarCobrancasEVendaCasada(f: FatosCobrancas): ResultadoCobrancas {
  const checklist: ItemChecklist[] = [];
  const alertas: Alerta[] = [];

  // -------------------------------------------------------------------
  // 1. Venda casada — seguro ou produto vinculado ao crédito
  // -------------------------------------------------------------------
  if (f.creditoCondicionadoASeguroOuProduto === null) {
    checklist.push({
      requisito: "Crédito não condicionado à contratação de seguro ou produto do financiador",
      artigo: `${FONTE_CDC_39}; ${FONTE_CC_ABUSO}`,
      atende: "INDETERMINADO",
      observacao: "Confirme se a liberação do crédito foi condicionada à contratação de algum seguro ou produto.",
    });
  } else if (f.creditoCondicionadoASeguroOuProduto === false) {
    checklist.push({
      requisito: "Crédito não condicionado à contratação de seguro ou produto do financiador",
      artigo: `${FONTE_CDC_39}; ${FONTE_CC_ABUSO}`,
      atende: true,
      observacao: "Sem indício de venda casada — crédito não condicionado a produto adicional.",
    });
  } else {
    const vendaCasadaCaracterizada = f.seguroOuProdutoVinculadoMesmoGrupo === true || f.houveOpcaoDeEscolhaOuRecusa === false;
    checklist.push({
      requisito: "Crédito não condicionado à contratação de seguro ou produto do financiador",
      artigo: `${FONTE_TEMA_972_TESE2}; ${FONTE_CC_ABUSO}`,
      atende: vendaCasadaCaracterizada ? false : "INDETERMINADO",
      observacao: vendaCasadaCaracterizada
        ? "Crédito condicionado a produto/seguro do próprio financiador (ou de empresa do mesmo grupo), sem opção " +
          "de escolha ou recusa demonstrada — indício de venda casada."
        : "Há produto vinculado ao crédito, mas falta confirmar se era do mesmo grupo econômico do financiador e " +
          "se houve opção de escolha ou recusa.",
    });

    if (vendaCasadaCaracterizada) {
      alertas.push({
        gravidade: "CRITICO",
        titulo: "Indício de venda casada de seguro ou produto vinculado ao crédito",
        texto:
          "O crédito foi condicionado à contratação de um produto do próprio financiador (ou de empresa do mesmo " +
          "grupo econômico), sem que conste opção de escolha de outra fornecedora ou de recusa. O STJ, no Tema " +
          `972 (tese 2), fixou que o cliente não pode ser compelido a contratar seguro com a instituição ` +
          "financeira ou com seguradora por ela indicada. Independentemente da natureza consumerista da relação, " +
          "o mesmo vício pode ser atacado pela via do abuso de direito e da boa-fé objetiva (CC, arts. 187, 421 e " +
          "422), já que o produtor rural, sem essa compra, não teria acesso ao crédito de que precisava." +
          (f.descricaoProdutoVinculado ? ` Produto identificado: ${f.descricaoProdutoVinculado}.` : ""),
        fonte: `${FONTE_TEMA_972_TESE2}; ${FONTE_RESP_CREDITO_RURAL}; ${FONTE_CC_ABUSO}`,
      });
      alertas.push({
        gravidade: "INFORMATIVO",
        titulo: "Antes de citar o CDC ou o Tema 972/STJ na peça",
        texto: AVISO_NATUREZA_CONSUMERISTA,
        fonte: FONTE_CDC_39,
      });
    }
  }

  // -------------------------------------------------------------------
  // 2. Tarifa de abertura de crédito (TAC) / emissão de carnê (TEC)
  // -------------------------------------------------------------------
  if (f.temTarifaAberturaCreditoOuEmissaoCarne === true) {
    if (!f.dataContratacao) {
      checklist.push({
        requisito: "Tarifa de abertura de crédito (TAC) / emissão de carnê (TEC) sem amparo legal",
        artigo: FONTE_SUMULA_565,
        atende: "INDETERMINADO",
        observacao: "Informe a data de contratação para conferir se a cobrança é anterior ou posterior a 30/04/2008.",
      });
    } else {
      const posteriorAResolucao = f.dataContratacao >= VIGENCIA_RESOLUCAO_3518;
      checklist.push({
        requisito: "Tarifa de abertura de crédito (TAC) / emissão de carnê (TEC) sem amparo legal",
        artigo: FONTE_SUMULA_565,
        atende: !posteriorAResolucao,
        observacao: posteriorAResolucao
          ? "Contrato posterior a 30/04/2008 (vigência da Resolução CMN nº 3.518/2007) — a cobrança de TAC/TEC, " +
            "ou outra denominação para o mesmo fato gerador, não tem mais amparo legal (Súmula 565/STJ)."
          : "Contrato anterior a 30/04/2008 — a pactuação de TAC/TEC era válida nesse período (Súmula 565/STJ).",
      });
      if (posteriorAResolucao) {
        alertas.push({
          gravidade: "CRITICO",
          titulo: "Cobrança de TAC/TEC sem amparo legal",
          texto:
            "O contrato é posterior a 30/04/2008, quando entrou em vigor a Resolução CMN nº 3.518/2007. A Súmula " +
            "565 do STJ é expressa: a pactuação de tarifa de abertura de crédito e de tarifa de emissão de carnê, " +
            "ou outra denominação para o mesmo fato gerador, só era válida em contratos anteriores a essa data.",
          fonte: FONTE_SUMULA_565,
        });
      }
    }
  } else if (f.temTarifaAberturaCreditoOuEmissaoCarne === null) {
    checklist.push({
      requisito: "Tarifa de abertura de crédito (TAC) / emissão de carnê (TEC) sem amparo legal",
      artigo: FONTE_SUMULA_565,
      atende: "INDETERMINADO",
      observacao: "Confirme se há cobrança de TAC, TEC ou tarifa equivalente sob outro nome.",
    });
  } else {
    checklist.push({
      requisito: "Tarifa de abertura de crédito (TAC) / emissão de carnê (TEC) sem amparo legal",
      artigo: FONTE_SUMULA_565,
      atende: true,
      observacao: "Sem cobrança de TAC/TEC identificada.",
    });
  }

  // -------------------------------------------------------------------
  // 3. Tarifa de cadastro — só pode ser cobrada no início do relacionamento
  // -------------------------------------------------------------------
  if (f.temTarifaCadastro === true) {
    if (f.tarifaCadastroCobradaApenasNoInicio === false) {
      checklist.push({
        requisito: "Tarifa de cadastro cobrada só no início do relacionamento",
        artigo: FONTE_SUMULA_566,
        atende: false,
        observacao: "Tarifa de cadastro cobrada fora do início do relacionamento — sem amparo na Súmula 566/STJ.",
      });
      alertas.push({
        gravidade: "ATENCAO",
        titulo: "Tarifa de cadastro cobrada fora do início do relacionamento",
        texto:
          "A Súmula 566 do STJ só permite a cobrança da tarifa de cadastro no início do relacionamento entre o " +
          "cliente e a instituição financeira. Se esta operação não é a primeira do produtor com o banco, ou se a " +
          "tarifa foi cobrada de novo em renegociação/aditivo, a cobrança carece de amparo.",
        fonte: FONTE_SUMULA_566,
      });
    } else {
      checklist.push({
        requisito: "Tarifa de cadastro cobrada só no início do relacionamento",
        artigo: FONTE_SUMULA_566,
        atende: f.tarifaCadastroCobradaApenasNoInicio === true ? true : "INDETERMINADO",
        observacao:
          f.tarifaCadastroCobradaApenasNoInicio === true
            ? "Tarifa de cadastro cobrada no início do relacionamento — compatível com a Súmula 566/STJ, desde que " +
              "prevista em ato normativo do Conselho Monetário Nacional."
            : "Confirme se a tarifa de cadastro foi cobrada apenas no início do relacionamento com o banco.",
      });
    }
  } else if (f.temTarifaCadastro === null) {
    checklist.push({
      requisito: "Tarifa de cadastro cobrada só no início do relacionamento",
      artigo: FONTE_SUMULA_566,
      atende: "INDETERMINADO",
      observacao: "Confirme se há cobrança de tarifa de cadastro.",
    });
  } else {
    checklist.push({
      requisito: "Tarifa de cadastro cobrada só no início do relacionamento",
      artigo: FONTE_SUMULA_566,
      atende: true,
      observacao: "Sem cobrança de tarifa de cadastro identificada.",
    });
  }

  // -------------------------------------------------------------------
  // 4. Tarifa de registro de contrato / gravame
  // -------------------------------------------------------------------
  if (f.temTarifaRegistroGravame === true) {
    if (!f.dataContratacao) {
      checklist.push({
        requisito: "Tarifa de registro de contrato/gravame sem repasse indevido ao cliente",
        artigo: FONTE_TEMA_972_TESE1,
        atende: "INDETERMINADO",
        observacao: "Informe a data de contratação para conferir se a cobrança é anterior ou posterior a 25/02/2011.",
      });
    } else {
      const posteriorAResolucao = f.dataContratacao >= VIGENCIA_RESOLUCAO_3954;
      checklist.push({
        requisito: "Tarifa de registro de contrato/gravame sem repasse indevido ao cliente",
        artigo: FONTE_TEMA_972_TESE1,
        atende: !posteriorAResolucao,
        observacao: posteriorAResolucao
          ? "Contrato posterior a 25/02/2011 (vigência da Resolução CMN nº 3.954/2011) — o repasse dessa despesa " +
            "ao cliente é abusivo (Tema 972/STJ, tese 1)."
          : "Contrato anterior a 25/02/2011 — a cláusula permanece válida, sujeita a controle de onerosidade " +
            "excessiva no caso concreto (Tema 972/STJ, tese 1).",
      });
      if (posteriorAResolucao) {
        alertas.push({
          gravidade: "ATENCAO",
          titulo: "Repasse da tarifa de registro de contrato/gravame ao cliente",
          texto:
            "O contrato é posterior a 25/02/2011, quando entrou em vigor a Resolução CMN nº 3.954/2011. A partir " +
            "dessa data, o Tema 972/STJ (tese 1) considera abusiva a cláusula que repassa ao cliente a despesa com " +
            "o registro do contrato/gravame.",
          fonte: FONTE_TEMA_972_TESE1,
        });
      }
    }
  } else if (f.temTarifaRegistroGravame === null) {
    checklist.push({
      requisito: "Tarifa de registro de contrato/gravame sem repasse indevido ao cliente",
      artigo: FONTE_TEMA_972_TESE1,
      atende: "INDETERMINADO",
      observacao: "Confirme se há repasse de tarifa de registro do contrato ou de gravame ao produtor.",
    });
  } else {
    checklist.push({
      requisito: "Tarifa de registro de contrato/gravame sem repasse indevido ao cliente",
      artigo: FONTE_TEMA_972_TESE1,
      atende: true,
      observacao: "Sem repasse de tarifa de registro/gravame identificado.",
    });
  }

  return { checklist, alertas };
}
