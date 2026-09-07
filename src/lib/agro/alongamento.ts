/**
 * Motor de orientação do alongamento da dívida rural.
 *
 * Diferente de `mp1376.ts` (que trata só da linha de composição de dívidas da
 * MP 1.376/2026), aqui está o regime GERAL do alongamento: o direito à
 * prorrogação do crédito rural, a controvérsia que pesa sobre ele hoje, e o
 * que o advogado precisa provar, alegar e anexar em cada caminho.
 *
 * FONTES (todas verificadas, nenhuma de memória):
 *
 *  - Lei nº 4.829/65 — institucionaliza o crédito rural.
 *  - Súmula 298/STJ (2ª Seção, 18/10/2004): "O alongamento de dívida originada
 *    de crédito rural não constitui faculdade da instituição financeira, mas,
 *    direito do devedor nos termos da lei."
 *  - MCR 2-6-4 (Manual de Crédito Rural, Bacen), redação anterior: autoriza a
 *    prorrogação mediante comprovação de dificuldade temporária de reembolso.
 *  - Resolução CMN nº 5.314, de 25/06/2026, vigente desde 01/07/2026: reescreve
 *    a Seção 6 do Capítulo 2 do MCR e passa a autorizar a prorrogação "por sua
 *    conveniência e decisão" da instituição financeira, e obriga a
 *    reclassificação da operação prorrogada para recursos não controlados.
 *  - MP nº 1.376, de 15/07/2026 — linha específica de composição de dívidas.
 *
 * O PONTO CENTRAL, e o motivo deste arquivo existir: a Resolução CMN
 * 5.314/2026 entrou em vigor três semanas antes da MP 1.376 e tentou
 * transformar o direito em faculdade. Isso partiu a análise em duas, conforme
 * a data — e o sistema não pode esconder essa controvérsia do advogado, nem
 * fingir que a tese do produtor é pacífica. Cada saída daqui traz a tese, a
 * contratese e a fonte, para o advogado decidir.
 */

export type HipoteseMcr = "COMERCIALIZACAO" | "FRUSTRACAO_SAFRA" | "OCORRENCIA_PREJUDICIAL" | "FLUXO_CAIXA_ACUMULADO";

export type RespostaBanco = "DEFERIDO" | "INDEFERIDO" | "SEM_RESPOSTA";

export type FatosAlongamento = {
  /// Data de contratação da operação — define qual redação do MCR governa.
  dataContratacao: Date | null;
  /// Vencimento final da dívida — o marco do alerta de tempestividade.
  dataVencimento: Date | null;
  /// Quando o pedido de prorrogação foi (ou será) protocolado no banco.
  dataPedidoAlongamento: Date | null;

  hipotesesMcr: HipoteseMcr[];

  temLaudoTecnico: boolean | null;
  /// Laudo produzido só pelo profissional contratado pelo produtor.
  laudoUnilateral: boolean | null;
  /// O banco foi formalmente convidado a acompanhar/participar da vistoria.
  bancoConvidadoParaLaudo: boolean | null;

  houvePedidoAdministrativo: boolean | null;
  respostaBanco: RespostaBanco | null;
  /// A recusa veio por escrito e com justificativa individualizada.
  recusaFundamentadaPorEscrito: boolean | null;

  /// Fonte de recursos Pronaf — muda o prazo de pedido após o vencimento.
  categoriaBeneficiario: "PRONAF" | "PRONAMP" | "DEMAIS" | null;
};

export type Gravidade = "CRITICO" | "ATENCAO" | "INFORMATIVO";

export type Alerta = {
  gravidade: Gravidade;
  titulo: string;
  texto: string;
  fonte: string;
};

export type Orientacao = {
  titulo: string;
  texto: string;
  fonte: string;
};

export type ResultadoAlongamento = {
  /// ANTERIOR = fatos regidos pela redação do MCR antes da Res. CMN 5.314/2026.
  regimeAplicavel: "ANTERIOR_5314" | "POSTERIOR_5314" | "INDETERMINADO";
  forcaDaTese: "FORTE" | "CONTROVERTIDA" | "INDETERMINADA";
  hipotesesReconhecidas: Array<{ hipotese: HipoteseMcr; descricao: string; fonte: string }>;
  alertas: Alerta[];
  orientacoes: Orientacao[];
  documentosNecessarios: string[];
  caminhoRecomendado: "ADMINISTRATIVO" | "JUDICIAL" | "ADMINISTRATIVO_E_JUDICIAL";
};

/** Vigência da Resolução CMN nº 5.314/2026 (publicada em 25/06/2026). */
const VIGENCIA_5314 = new Date("2026-07-01T00:00:00-03:00");

const DESCRICAO_HIPOTESE: Record<HipoteseMcr, string> = {
  COMERCIALIZACAO: "Dificuldade de comercialização dos produtos.",
  FRUSTRACAO_SAFRA: "Frustração de safra por fatores adversos.",
  OCORRENCIA_PREJUDICIAL: "Eventuais ocorrências prejudiciais ao desenvolvimento das operações.",
  FLUXO_CAIXA_ACUMULADO:
    "Dificuldade de fluxo de caixa pelo impacto acumulado de perdas de safras anteriores por eventos climáticos, " +
    "que gerem aumento do endividamento no Sistema Nacional de Crédito Rural e impeçam o reembolso integral.",
};

const FONTE_MCR = "MCR 2-6-4 (Manual de Crédito Rural, Banco Central)";
const FONTE_SUMULA = "Súmula 298/STJ (2ª Seção, 18/10/2004)";
const FONTE_5314 = "Resolução CMN nº 5.314, de 25/06/2026 (vigente desde 01/07/2026)";

export function analisarAlongamento(f: FatosAlongamento): ResultadoAlongamento {
  const alertas: Alerta[] = [];
  const orientacoes: Orientacao[] = [];
  const documentosNecessarios: string[] = [];

  // -------------------------------------------------------------------
  // 1. Qual regime governa o caso
  // -------------------------------------------------------------------
  const referencia = f.dataPedidoAlongamento ?? f.dataContratacao;
  let regimeAplicavel: ResultadoAlongamento["regimeAplicavel"] = "INDETERMINADO";
  let forcaDaTese: ResultadoAlongamento["forcaDaTese"] = "INDETERMINADA";

  if (referencia) {
    regimeAplicavel = referencia < VIGENCIA_5314 ? "ANTERIOR_5314" : "POSTERIOR_5314";
  }

  if (regimeAplicavel === "ANTERIOR_5314") {
    forcaDaTese = "FORTE";
    orientacoes.push({
      titulo: "Regime anterior à Resolução CMN 5.314/2026 — tese mais forte",
      texto:
        "Os fatos são anteriores a 01/07/2026, quando a prorrogação ainda era devida mediante comprovação da " +
        "dificuldade temporária. Sustente o alongamento como direito (Súmula 298/STJ), invocando ainda o " +
        "tempus regit actum e a proteção ao ato jurídico perfeito (CF, art. 5º, XXXVI) contra a aplicação " +
        "retroativa da nova redação do MCR.",
      fonte: `${FONTE_SUMULA}; ${FONTE_MCR}; CF, art. 5º, XXXVI`,
    });
  } else if (regimeAplicavel === "POSTERIOR_5314") {
    forcaDaTese = "CONTROVERTIDA";
    alertas.push({
      gravidade: "CRITICO",
      titulo: "Fatos sob a Resolução CMN 5.314/2026 — o banco vai alegar discricionariedade",
      texto:
        "Desde 01/07/2026 o MCR passou a autorizar a prorrogação 'por conveniência e decisão' da instituição " +
        "financeira. O banco vai sustentar que não há direito, e sim faculdade. A tese do produtor não está " +
        "perdida, mas exige atacar a validade da resolução: ato do CMN não pode contrariar lei federal, e a " +
        "Súmula 298 continua vinculando a interpretação do regime legal do crédito rural.",
      fonte: FONTE_5314,
    });
    orientacoes.push({
      titulo: "Como atacar a Resolução CMN 5.314/2026",
      texto:
        "Três frentes, cumuláveis: (a) vício de hierarquia — resolução do CMN não revoga nem restringe direito " +
        "assegurado em lei federal; (b) abuso de direito, boa-fé objetiva e função social do contrato " +
        "(CC, arts. 187, 422 e 421), se a recusa for imotivada; (c) exigir do banco recusa escrita e " +
        "individualizada, com critérios objetivos — a ausência de motivação é, por si, fundamento de controle.",
      fonte: `${FONTE_5314}; CC, arts. 187, 421 e 422`,
    });
  } else {
    alertas.push({
      gravidade: "ATENCAO",
      titulo: "Sem data para definir o regime aplicável",
      texto:
        "Informe a data de contratação e a data do pedido de prorrogação. É o que define se o caso é regido " +
        "pela redação anterior do MCR (tese forte) ou pela Resolução CMN 5.314/2026 (tese controvertida).",
      fonte: FONTE_5314,
    });
  }

  // A contratese que o banco levanta contra a própria Súmula 298.
  alertas.push({
    gravidade: "INFORMATIVO",
    titulo: "Contratese previsível do banco sobre a Súmula 298",
    texto:
      "Há corrente sustentando que a Súmula 298 estaria limitada à Lei 9.138/95, que alcançava apenas operações " +
      "contratadas até 20/06/1995 — e há acórdão nesse sentido (TJSP, Apelação Cível 1001538-58.2022.8.26.0315). " +
      "A resposta é que o alongamento não se esgota naquela lei: ele decorre do regime geral do crédito rural " +
      "(Lei 4.829/65) e do MCR, que seguem vigentes. Antecipe esse debate na inicial.",
    fonte: `${FONTE_SUMULA}; Lei nº 4.829/65`,
  });

  // -------------------------------------------------------------------
  // 2. Hipóteses do MCR 2-6-4
  // -------------------------------------------------------------------
  const hipotesesReconhecidas = f.hipotesesMcr.map((h) => ({
    hipotese: h,
    descricao: DESCRICAO_HIPOTESE[h],
    fonte: FONTE_MCR,
  }));

  if (hipotesesReconhecidas.length === 0) {
    alertas.push({
      gravidade: "CRITICO",
      titulo: "Nenhuma hipótese de prorrogação apontada",
      texto:
        "O alongamento depende de enquadrar o caso em pelo menos uma das hipóteses do MCR 2-6-4. Sem indicar " +
        "qual delas, e sem prová-la, não há pedido a sustentar — nem administrativamente, nem em juízo.",
      fonte: FONTE_MCR,
    });
  }

  // -------------------------------------------------------------------
  // 3. Tempestividade — o pedido antes do vencimento
  // -------------------------------------------------------------------
  if (f.dataVencimento && f.dataPedidoAlongamento) {
    if (f.dataPedidoAlongamento > f.dataVencimento) {
      const prazoPronaf = f.categoriaBeneficiario === "PRONAF";
      alertas.push({
        gravidade: "CRITICO",
        titulo: "Pedido protocolado depois do vencimento",
        texto:
          "Há prática consolidada e decisões formalistas exigindo que o pedido de prorrogação seja feito ANTES do " +
          "vencimento da dívida. O pedido posterior não é impossível — o MCR 2-6-7 admite renegociar operação em " +
          "curso irregular" +
          (prazoPronaf
            ? ", e no Pronaf o MCR 10-1-27-f admite pedido após o vencimento em 30 dias (BNDES), 120 dias " +
              "(FNO/FCO/FNE) ou 60 dias (demais fontes)"
            : "") +
          " — mas o risco de rejeição por intempestividade é real e precisa ser enfrentado expressamente na peça.",
        fonte: `${FONTE_MCR}; MCR 2-6-7; MCR 10-1-27-f`,
      });
    } else {
      orientacoes.push({
        titulo: "Pedido tempestivo",
        texto: "O pedido foi protocolado antes do vencimento — é o caminho seguro e afasta a alegação de intempestividade.",
        fonte: FONTE_MCR,
      });
    }
  } else if (f.dataVencimento && !f.dataPedidoAlongamento) {
    const hoje = new Date();
    if (f.dataVencimento > hoje) {
      alertas.push({
        gravidade: "ATENCAO",
        titulo: "Protocole o pedido antes do vencimento",
        texto:
          `A dívida vence em ${f.dataVencimento.toLocaleDateString("pt-BR")} e ainda não há pedido protocolado. ` +
          "Protocolar antes do vencimento, com comprovante de recebimento, é o que evita a discussão de " +
          "intempestividade mais adiante.",
        fonte: FONTE_MCR,
      });
    } else {
      alertas.push({
        gravidade: "CRITICO",
        titulo: "Dívida já vencida e sem pedido protocolado",
        texto:
          "A dívida já venceu e não há registro de pedido de prorrogação. Protocole imediatamente, por escrito e " +
          "com prova de recebimento, e sustente na peça o cabimento do pedido posterior ao vencimento.",
        fonte: `${FONTE_MCR}; MCR 2-6-7`,
      });
    }
  }

  // -------------------------------------------------------------------
  // 4. Laudo — a prova que decide o caso
  // -------------------------------------------------------------------
  if (f.temLaudoTecnico === false) {
    alertas.push({
      gravidade: "CRITICO",
      titulo: "Sem laudo técnico não há como comprovar a perda",
      texto:
        "A comprovação da dificuldade temporária depende de informação técnica que permita ao banco verificar o " +
        "fato gerador, sua intensidade e o percentual de redução da renda. Sem laudo, o pedido administrativo " +
        "tende ao indeferimento e a ação nasce sem prova.",
      fonte: `${FONTE_MCR}; ${FONTE_SUMULA}`,
    });
  }

  if (f.temLaudoTecnico && f.laudoUnilateral !== false) {
    alertas.push({
      gravidade: "ATENCAO",
      titulo: "Laudo unilateral tem força probatória mitigada",
      texto:
        "Laudo produzido apenas pelo profissional contratado pelo produtor, sem contraditório, tem valor " +
        "probatório reduzido: serve para esclarecer fatos, mas não sustenta sozinho a convicção do juízo, e " +
        "precisa ser corroborado por outras provas. Prepare-se para o banco impugná-lo.",
      fonte: "Jurisprudência consolidada sobre prova pericial unilateral; CPC, arts. 369 e 479",
    });

    if (f.bancoConvidadoParaLaudo !== true) {
      orientacoes.push({
        titulo: "Convide o banco para a vistoria — por escrito",
        texto:
          "Antes ou durante a produção do laudo, convide formalmente a instituição financeira a indicar " +
          "assistente técnico e acompanhar a vistoria, com prova de recebimento do convite. Isso muda o jogo " +
          "duas vezes: aproxima o laudo do contraditório e, se o banco não comparecer, o silêncio dele passa a " +
          "ser argumento seu. Guarde o convite e o aviso de recebimento para instruir a inicial.",
        fonte: "CPC, arts. 190 e 471 (prova por convenção das partes); CC, art. 422 (boa-fé objetiva)",
      });
      orientacoes.push({
        titulo: "Considere a produção antecipada de prova",
        texto:
          "Quando a perda é perecível — lavoura que será colhida, replantada ou perdida — a produção antecipada " +
          "de prova (CPC, art. 381) permite documentar o dano sob contraditório antes que o objeto desapareça. " +
          "É a via mais segura para superar a fragilidade do laudo unilateral.",
        fonte: "CPC, art. 381",
      });
    } else {
      orientacoes.push({
        titulo: "Banco convidado — registre isso na peça",
        texto:
          "O convite formal ao banco reduz muito a impugnação por unilateralidade. Anexe o convite, o comprovante " +
          "de recebimento e, se houve ausência, registre-a expressamente na inicial.",
        fonte: "CC, art. 422 (boa-fé objetiva)",
      });
    }
  }

  // -------------------------------------------------------------------
  // 5. Caminho: administrativo antes do judicial
  // -------------------------------------------------------------------
  let caminhoRecomendado: ResultadoAlongamento["caminhoRecomendado"] = "ADMINISTRATIVO";

  if (f.houvePedidoAdministrativo !== true) {
    orientacoes.push({
      titulo: "Comece pelo requerimento administrativo",
      texto:
        "Protocole o pedido de prorrogação diretamente na instituição financeira, por escrito e com prova de " +
        "recebimento, antes de ajuizar. Isso constitui a mora do banco, demonstra interesse de agir e, se vier " +
        "indeferimento sem motivação, cria o documento que sustenta a ação.",
      fonte: `${FONTE_MCR}; MP nº 1.376/2026, art. 4º, II`,
    });
  } else if (f.respostaBanco === "INDEFERIDO") {
    caminhoRecomendado = "JUDICIAL";
    if (f.recusaFundamentadaPorEscrito === false) {
      alertas.push({
        gravidade: "ATENCAO",
        titulo: "Recusa sem motivação escrita — use isso",
        texto:
          "A recusa sem justificativa individualizada e por escrito é fundamento autônomo de controle judicial: " +
          "sem critério objetivo declarado, não há como aferir se houve análise real ou arbítrio. Peça a exibição " +
          "dos critérios e da análise de risco na inicial.",
        fonte: "CC, arts. 187 e 422; CPC, art. 396 (exibição de documento)",
      });
    }
    orientacoes.push({
      titulo: "Indeferimento administrativo — via judicial aberta",
      texto:
        "Com o indeferimento documentado, está caracterizado o interesse de agir. A ação cumula a revisão das " +
        "cláusulas contratuais com o pedido de alongamento, e pede a tutela de urgência para impedir que a " +
        "cobrança avance enquanto se discute o direito.",
      fonte: FONTE_SUMULA,
    });
  } else if (f.respostaBanco === "SEM_RESPOSTA") {
    caminhoRecomendado = "ADMINISTRATIVO_E_JUDICIAL";
    alertas.push({
      gravidade: "ATENCAO",
      titulo: "Banco silente",
      texto:
        "O silêncio do banco diante de pedido formal, somado ao vencimento próximo ou a atos de cobrança em " +
        "curso, autoriza o ajuizamento com pedido de urgência. Documente a data do protocolo e o decurso do prazo.",
      fonte: "CC, art. 422 (boa-fé objetiva)",
    });
  } else if (f.respostaBanco === "DEFERIDO") {
    orientacoes.push({
      titulo: "Pedido deferido — confira as condições antes de assinar",
      texto:
        "Deferido o alongamento, confira encargos, prazo e garantias exigidas contra o que a norma assegura. " +
        "Prorrogação com encargos diferentes dos contratados, ou com garantia nova desproporcional, é ponto de " +
        "impugnação — inclusive porque a operação prorrogada passa a ser reclassificada para recursos não " +
        "controlados.",
      fonte: `${FONTE_MCR}; ${FONTE_5314}`,
    });
  }

  // -------------------------------------------------------------------
  // 6. Documentos que a peça vai exigir
  // -------------------------------------------------------------------
  documentosNecessarios.push(
    "Contrato de crédito rural (cédula, contrato e aditivos), completo e legível",
    "Laudo técnico de profissional habilitado, com metodologia, renda esperada x apurada e nexo causal",
    "ART/TRT ou anotação de responsabilidade técnica do profissional que assinou o laudo",
    "Comprovante de protocolo do requerimento administrativo no banco, com data e recebimento",
    "Resposta do banco, se houver — ou prova do decurso do prazo sem resposta",
    "Histórico de produção das safras envolvidas (notas fiscais, romaneios, contratos de venda)",
    "Documentos climáticos: boletins do Inmet/Cemaden, decreto de emergência ou calamidade do município",
    "Comprovantes de Proagro ou apólice de seguro rural, e eventual indenização recebida",
    "Extrato ou demonstrativo de evolução da dívida fornecido pelo banco",
    "Documentos pessoais e comprovação da atividade rural do mutuário",
    "Procuração e, se for o caso, declaração de hipossuficiência",
  );

  if (f.temLaudoTecnico && f.laudoUnilateral !== false && f.bancoConvidadoParaLaudo !== true) {
    documentosNecessarios.push("Convite formal ao banco para acompanhar a vistoria, com comprovante de envio");
  }

  return {
    regimeAplicavel,
    forcaDaTese,
    hipotesesReconhecidas,
    alertas,
    orientacoes,
    documentosNecessarios,
    caminhoRecomendado,
  };
}
