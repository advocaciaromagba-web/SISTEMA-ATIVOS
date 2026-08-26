/**
 * Catálogo dos documentos que a plataforma gera.
 *
 * Cada entrada declara: para que serve, quais partes precisam existir antes de
 * gerar, quais campos são obrigatórios e em que lei o documento se apoia. A tela
 * lê daqui — não há lista escrita duas vezes.
 */

export type PapelParte =
  | "CEDENTE"
  | "CESSIONARIO"
  | "INTERMEDIARIO"
  | "REPRESENTANTE"
  | "TESTEMUNHA"
  | "ANUENTE"
  | "GARANTIDOR"
  | "INVESTIDOR"
  | "DIVULGADOR"
  | "RECEPTOR"
  | "MANDATARIO_VENDA"
  | "MANDATARIO_COMPRA";

export const PAPEIS: Record<PapelParte, string> = {
  CEDENTE: "Cedente (quem vende o ativo)",
  CESSIONARIO: "Cessionário (quem compra o ativo)",
  INTERMEDIARIO: "Intermediário",
  REPRESENTANTE: "Representante / procurador",
  TESTEMUNHA: "Testemunha",
  ANUENTE: "Anuente (cônjuge, sócio, terceiro que concorda)",
  GARANTIDOR: "Garantidor / avalista",
  INVESTIDOR: "Investidor",
  DIVULGADOR: "Parte divulgadora (quem revela a oportunidade)",
  RECEPTOR: "Parte receptora (quem recebe a informação)",
  MANDATARIO_VENDA: "Mandatário de venda",
  MANDATARIO_COMPRA: "Mandatário de compra",
};

export const TIPOS_ATIVO: Record<string, string> = {
  PRECATORIO: "Precatório",
  CREDITO_ICMS: "Crédito acumulado de ICMS",
  CREDITO_PIS_COFINS: "Crédito de PIS/COFINS",
  CREDITO_TRIBUTARIO: "Crédito tributário (outros)",
  CREDITO_RURAL: "Crédito rural / CPR",
  CREDAQ: "CredAq / crédito de aquisição",
  COMMODITY: "Commodity",
  OURO: "Ouro (Au)",
  METAIS: "Metais e minérios",
  DIREITO_CREDITORIO: "Direito creditório (outros)",
  IMOVEL: "Imóvel",
  OUTRO: "Outro ativo",
};

export const FASES: Record<string, string> = {
  PROSPECCAO: "Prospecção",
  NDA: "Sigilo firmado",
  DUE_DILIGENCE: "Due diligence",
  PROPOSTA: "Proposta",
  CONTRATO: "Contrato",
  LIQUIDACAO: "Liquidação",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export type CampoExtra = {
  chave: string;
  rotulo: string;
  tipo: "texto" | "numero" | "percentual" | "moeda" | "data" | "area" | "opcao";
  obrigatorio?: boolean;
  padrao?: string | number;
  ajuda?: string;
  opcoes?: Array<{ valor: string; rotulo: string }>;
};

export type TipoDocumento = {
  chave: string;
  nome: string;
  /// Uma frase explicando para que serve, em linguagem de quem não é advogado.
  paraQueServe: string;
  /// Papéis que precisam estar preenchidos na operação antes de gerar.
  papeisObrigatorios: PapelParte[];
  papeisOpcionais?: PapelParte[];
  /// Campos que o operador preenche na hora de gerar.
  campos?: CampoExtra[];
  /// Base legal, mostrada na tela e impressa no rodapé do documento.
  baseLegal: string[];
  /// Aviso que aparece antes de gerar. Serve para evitar erro grave.
  alerta?: string;
  /// Se este documento precisa de duas testemunhas para valer como título executivo.
  exigeTestemunhas?: boolean;
  /// Se recomenda registro em cartório ou escritura pública.
  exigeFormaEspecial?: string;
  /**
   * Se este documento precisa de uma empresa licitante em vez de uma operação.
   *
   * As declarações de habilitação não cedem nem compram ativo: são
   * declaração unilateral de uma empresa perante o ente público, reaproveitável
   * em qualquer certame. Por isso pedem uma `Pessoa` avulsa do cadastro
   * (`ctx.licitante`), não uma operação com partes.
   */
  exigeLicitante?: boolean;
  /// Ordem de exibição na tela.
  ordem: number;
};

/** Os três dados do certame que toda declaração de licitação carrega. */
const CAMPOS_CERTAME: CampoExtra[] = [
  { chave: "orgaoLicitante", rotulo: "Órgão licitante", tipo: "texto", obrigatorio: true, ajuda: "Ex.: Prefeitura Municipal de Icém/SP." },
  { chave: "modalidade", rotulo: "Modalidade", tipo: "opcao", obrigatorio: true, opcoes: [
    { valor: "Pregão Presencial", rotulo: "Pregão Presencial" },
    { valor: "Pregão Eletrônico", rotulo: "Pregão Eletrônico" },
    { valor: "Concorrência", rotulo: "Concorrência" },
    { valor: "Tomada de Preços", rotulo: "Tomada de Preços" },
    { valor: "Dispensa de Licitação", rotulo: "Dispensa de Licitação" },
    { valor: "Convite", rotulo: "Convite" },
  ] },
  { chave: "numeroCertame", rotulo: "Número do certame", tipo: "texto", obrigatorio: true, ajuda: "Ex.: 004/2021." },
];

export const CATALOGO: TipoDocumento[] = [
  // -----------------------------------------------------------------
  // 1. SIGILO E PROTEÇÃO DA CADEIA
  // -----------------------------------------------------------------
  {
    chave: "NDA",
    nome: "Acordo de Confidencialidade (NDA)",
    paraQueServe:
      "Protege as informações trocadas antes do negócio: números do ativo, nome do detentor, condições. Quem recebe não pode repassar nem usar para outro fim.",
    papeisObrigatorios: ["CEDENTE", "CESSIONARIO"],
    papeisOpcionais: ["INTERMEDIARIO", "TESTEMUNHA"],
    baseLegal: ["Código Civil, arts. 186, 187 e 422", "Lei 13.709/2018 (LGPD)", "Lei 9.279/1996, art. 195, XI"],
    campos: [
      { chave: "prazoMeses", rotulo: "Prazo de sigilo (meses)", tipo: "numero", padrao: 24, obrigatorio: true },
      { chave: "multa", rotulo: "Multa por quebra de sigilo", tipo: "moeda", ajuda: "Deixe em branco para usar multa proporcional ao negócio." },
      { chave: "objeto", rotulo: "Objeto das tratativas", tipo: "area", ajuda: "Descreva sem revelar o sigilo que se quer proteger." },
    ],
    ordem: 10,
  },
  {
    chave: "NCNDA",
    nome: "NCNDA — Sigilo e Não Circunvenção",
    paraQueServe:
      "É o NDA somado à proteção do intermediário: impede que as partes se procurem por fora e deixem quem apresentou o negócio sem comissão. É o documento que protege o seu lugar na mesa.",
    papeisObrigatorios: ["INTERMEDIARIO"],
    papeisOpcionais: ["CEDENTE", "CESSIONARIO", "TESTEMUNHA"],
    baseLegal: [
      "Código Civil, arts. 422 (boa-fé), 425 (contrato atípico) e 722 a 729 (corretagem)",
      "Código Civil, art. 927 (dever de indenizar)",
    ],
    campos: [
      { chave: "prazoMeses", rotulo: "Prazo de vigência (meses)", tipo: "numero", padrao: 24, obrigatorio: true },
      { chave: "comissaoPercentual", rotulo: "Comissão protegida (%)", tipo: "percentual", obrigatorio: true },
      { chave: "multaPercentual", rotulo: "Multa por circunvenção (% do negócio)", tipo: "percentual", padrao: 10 },
      { chave: "transacoesFuturas", rotulo: "Alcança operações futuras entre as mesmas partes?", tipo: "opcao", padrao: "sim", opcoes: [{ valor: "sim", rotulo: "Sim" }, { valor: "nao", rotulo: "Não" }] },
    ],
    alerta:
      "O NCNDA só protege de verdade se as partes que ele nomeia forem exatamente as que participarem do negócio. Cadastre todos os elos da cadeia antes de gerar.",
    exigeTestemunhas: true,
    ordem: 20,
  },
  {
    chave: "IMFPA",
    nome: "IMFPA — Acordo Irrevogável de Comissão",
    paraQueServe:
      "Garante o pagamento da comissão diretamente pelo pagador da operação, sem depender da boa vontade de quem está na frente. Padrão em operações de commodities.",
    papeisObrigatorios: ["INTERMEDIARIO"],
    papeisOpcionais: ["CEDENTE", "CESSIONARIO", "TESTEMUNHA"],
    baseLegal: ["Código Civil, arts. 425, 722 a 729", "Código Civil, art. 286 (cessão de crédito da comissão)"],
    campos: [
      { chave: "comissaoPercentual", rotulo: "Comissão (%)", tipo: "percentual", obrigatorio: true },
      { chave: "baseCalculo", rotulo: "Base de cálculo da comissão", tipo: "texto", padrao: "valor bruto de cada operação liquidada" },
      { chave: "prazoPagamentoDias", rotulo: "Prazo de pagamento após liquidação (dias)", tipo: "numero", padrao: 3 },
      { chave: "bancoDados", rotulo: "Dados bancários para o pagamento", tipo: "area" },
    ],
    alerta:
      "Documento com histórico de uso em fraudes internacionais. Só emita depois de confirmar a existência do ativo e a identidade do pagador — a auditoria da plataforma existe para isso.",
    ordem: 30,
  },

  // -----------------------------------------------------------------
  // 2. REPRESENTAÇÃO
  // -----------------------------------------------------------------
  {
    chave: "PROCURACAO",
    nome: "Procuração (ad negotia)",
    paraQueServe:
      "Dá poderes para alguém tratar do ativo em nome do titular: negociar, assinar, receber, dar quitação, falar com órgãos públicos.",
    papeisObrigatorios: ["CEDENTE"],
    papeisOpcionais: ["REPRESENTANTE", "INTERMEDIARIO"],
    baseLegal: ["Código Civil, arts. 653 a 692", "Código Civil, art. 661, § 1º (poderes especiais)"],
    campos: [
      { chave: "poderes", rotulo: "Poderes conferidos", tipo: "area", ajuda: "Deixe em branco para usar a redação padrão de representação do ativo." },
      { chave: "prazoMeses", rotulo: "Prazo de validade (meses)", tipo: "numero", padrao: 12 },
      { chave: "substabelecer", rotulo: "Permite substabelecer?", tipo: "opcao", padrao: "sim", opcoes: [{ valor: "sim", rotulo: "Sim, com reservas" }, { valor: "nao", rotulo: "Não" }] },
      { chave: "irrevogavel", rotulo: "Cláusula de irrevogabilidade?", tipo: "opcao", padrao: "nao", opcoes: [{ valor: "sim", rotulo: "Sim (art. 684)" }, { valor: "nao", rotulo: "Não" }] },
    ],
    alerta:
      "Para receber valores, transigir e dar quitação a lei exige poderes expressos (art. 661, § 1º). Se for movimentar precatório, o tribunal normalmente exige procuração por instrumento público.",
    exigeFormaEspecial: "Instrumento público quando o ato final exigir (venda de imóvel, levantamento de precatório).",
    ordem: 40,
  },
  {
    chave: "MANDATO",
    nome: "Mandato de Representação Comercial",
    paraQueServe:
      "Contrata o intermediário para representar o titular na busca de comprador ou vendedor, com exclusividade ou não, definindo a remuneração.",
    papeisObrigatorios: ["CEDENTE", "INTERMEDIARIO"],
    papeisOpcionais: ["TESTEMUNHA"],
    baseLegal: ["Código Civil, arts. 653 a 692 (mandato)", "Código Civil, arts. 722 a 729 (corretagem)"],
    campos: [
      { chave: "exclusividade", rotulo: "Exclusividade", tipo: "opcao", padrao: "sim", opcoes: [{ valor: "sim", rotulo: "Com exclusividade" }, { valor: "nao", rotulo: "Sem exclusividade" }] },
      { chave: "prazoMeses", rotulo: "Prazo (meses)", tipo: "numero", padrao: 6, obrigatorio: true },
      { chave: "comissaoPercentual", rotulo: "Remuneração (%)", tipo: "percentual", obrigatorio: true },
      { chave: "despesas", rotulo: "Quem arca com despesas", tipo: "opcao", padrao: "intermediario", opcoes: [{ valor: "intermediario", rotulo: "Intermediário" }, { valor: "titular", rotulo: "Titular do ativo" }] },
    ],
    exigeTestemunhas: true,
    ordem: 50,
  },

  // -----------------------------------------------------------------
  // 3. TRANSFERÊNCIA DO ATIVO
  // -----------------------------------------------------------------
  {
    chave: "LOI",
    nome: "Carta de Intenção / Proposta (LOI)",
    paraQueServe:
      "Formaliza a proposta antes do contrato: preço, deságio, prazo e condições. Serve para travar a negociação enquanto a auditoria corre.",
    papeisObrigatorios: ["CESSIONARIO"],
    papeisOpcionais: ["CEDENTE", "INTERMEDIARIO"],
    baseLegal: ["Código Civil, arts. 427 a 435 (proposta e aceitação)", "Código Civil, art. 422 (boa-fé nas tratativas)"],
    campos: [
      { chave: "validadeDias", rotulo: "Validade da proposta (dias)", tipo: "numero", padrao: 15, obrigatorio: true },
      { chave: "vinculante", rotulo: "Natureza", tipo: "opcao", padrao: "nao", opcoes: [{ valor: "nao", rotulo: "Não vinculante (só sigilo e exclusividade obrigam)" }, { valor: "sim", rotulo: "Vinculante" }] },
      { chave: "condicoes", rotulo: "Condições da proposta", tipo: "area", ajuda: "Ex.: sujeita à auditoria, à certidão negativa, à anuência do tribunal." },
      { chave: "exclusividadeDias", rotulo: "Exclusividade de negociação (dias)", tipo: "numero", padrao: 30 },
    ],
    ordem: 60,
  },
  {
    chave: "CESSAO_CREDITO",
    nome: "Contrato de Cessão de Crédito",
    paraQueServe:
      "Transfere o crédito do cedente para o cessionário. É o contrato principal da operação de crédito.",
    papeisObrigatorios: ["CEDENTE", "CESSIONARIO"],
    papeisOpcionais: ["INTERMEDIARIO", "ANUENTE", "GARANTIDOR", "TESTEMUNHA"],
    baseLegal: [
      "Código Civil, arts. 286 a 298 (cessão de crédito)",
      "Código Civil, art. 290 (eficácia perante o devedor depende de notificação)",
      "Código Civil, art. 295 (o cedente responde pela existência do crédito)",
    ],
    campos: [
      { chave: "responsabilidade", rotulo: "Responsabilidade do cedente", tipo: "opcao", padrao: "veritas", opcoes: [{ valor: "veritas", rotulo: "Só pela existência do crédito (pro soluto)" }, { valor: "bonitas", rotulo: "Também pela solvência do devedor (pro solvendo)" }] },
      { chave: "formaPagamento", rotulo: "Forma de pagamento", tipo: "area", obrigatorio: true },
      { chave: "condicaoSuspensiva", rotulo: "Condição suspensiva", tipo: "area", ajuda: "Ex.: pagamento só após habilitação do cessionário no tribunal." },
      { chave: "multaPercentual", rotulo: "Multa por descumprimento (%)", tipo: "percentual", padrao: 10 },
    ],
    alerta:
      "A cessão só produz efeito contra o devedor depois que ele for notificado (art. 290). O sistema gera a notificação junto — não deixe de enviá-la.",
    exigeTestemunhas: true,
    ordem: 70,
  },
  {
    chave: "CESSAO_DIREITOS",
    nome: "Cessão de Direitos",
    paraQueServe:
      "Transfere direitos que ainda não são crédito líquido: posição contratual, direitos de ação, expectativa de recebimento.",
    papeisObrigatorios: ["CEDENTE", "CESSIONARIO"],
    papeisOpcionais: ["INTERMEDIARIO", "ANUENTE", "TESTEMUNHA"],
    baseLegal: ["Código Civil, arts. 286 a 298", "Código Civil, arts. 104 e 107 (forma)", "CPC, art. 109 (cessão de direito litigioso)"],
    campos: [
      { chave: "direitosCedidos", rotulo: "Direitos cedidos", tipo: "area", obrigatorio: true },
      { chave: "litigioso", rotulo: "O direito está em discussão judicial?", tipo: "opcao", padrao: "nao", opcoes: [{ valor: "sim", rotulo: "Sim" }, { valor: "nao", rotulo: "Não" }] },
      { chave: "formaPagamento", rotulo: "Forma de pagamento", tipo: "area", obrigatorio: true },
    ],
    alerta:
      "Se o direito estiver em processo judicial, a cessão não afasta o cedente do polo sem concordância da parte contrária (CPC, art. 109, § 1º).",
    exigeTestemunhas: true,
    ordem: 80,
  },
  {
    chave: "CESSAO_PRECATORIO",
    nome: "Cessão de Precatório",
    paraQueServe:
      "Transfere um precatório do titular para o comprador, com as exigências próprias que o tribunal cobra para reconhecer a transferência.",
    papeisObrigatorios: ["CEDENTE", "CESSIONARIO"],
    papeisOpcionais: ["INTERMEDIARIO", "ANUENTE", "TESTEMUNHA"],
    baseLegal: [
      "Constituição Federal, art. 100, §§ 13 e 14",
      "Código Civil, arts. 286 a 298",
      "Resolução CNJ 303/2019",
    ],
    campos: [
      { chave: "formaPagamento", rotulo: "Forma de pagamento", tipo: "area", obrigatorio: true },
      { chave: "responsavelHabilitacao", rotulo: "Quem protocola a habilitação no tribunal", tipo: "opcao", padrao: "cessionario", opcoes: [{ valor: "cessionario", rotulo: "Cessionário" }, { valor: "cedente", rotulo: "Cedente" }, { valor: "ambos", rotulo: "Ambos, em conjunto" }] },
      { chave: "irRetido", rotulo: "Tratamento do imposto de renda", tipo: "area", ajuda: "A cessão não muda a natureza do crédito para fins tributários (art. 100, § 13)." },
    ],
    alerta:
      "Atenção às duas exigências que derrubam a maioria das cessões: a transferência só produz efeitos depois de comunicada por petição ao tribunal de origem e à entidade devedora (CF, art. 100, § 14), e a cessão não transfere a preferência por idade, doença ou natureza alimentar (§ 13).",
    exigeFormaEspecial:
      "Vários tribunais exigem instrumento público ou reconhecimento de firma. Confira o regulamento do tribunal de origem antes de assinar.",
    exigeTestemunhas: true,
    ordem: 90,
  },
  {
    chave: "NOTIFICACAO_DEVEDOR",
    nome: "Notificação de Cessão ao Devedor",
    paraQueServe:
      "Avisa formalmente o devedor de que o crédito mudou de dono. Sem isso, o pagamento feito ao antigo credor é válido e o comprador perde o dinheiro.",
    papeisObrigatorios: ["CEDENTE", "CESSIONARIO"],
    baseLegal: ["Código Civil, art. 290", "Código Civil, art. 292 (pagamento ao cedente antes da notificação libera o devedor)"],
    campos: [
      { chave: "destinatario", rotulo: "Nome do devedor / órgão notificado", tipo: "texto", obrigatorio: true },
      { chave: "enderecoDestinatario", rotulo: "Endereço para envio", tipo: "area", obrigatorio: true },
      { chave: "dadosPagamento", rotulo: "Onde o devedor deve pagar agora", tipo: "area", obrigatorio: true },
    ],
    ordem: 100,
  },

  // -----------------------------------------------------------------
  // 4. REMUNERAÇÃO E ENCERRAMENTO
  // -----------------------------------------------------------------
  {
    chave: "TERMO_COMISSAO",
    nome: "Termo de Comissionamento",
    paraQueServe:
      "Define quanto cada intermediário recebe, quando recebe e em que ordem — inclusive quando a cadeia tem mais de um.",
    papeisObrigatorios: ["INTERMEDIARIO"],
    papeisOpcionais: ["CEDENTE", "CESSIONARIO", "TESTEMUNHA"],
    baseLegal: ["Código Civil, arts. 722 a 729", "Código Civil, art. 725 (comissão devida ainda que o negócio se conclua depois)"],
    campos: [
      { chave: "gatilho", rotulo: "Quando a comissão é devida", tipo: "opcao", padrao: "liquidacao", opcoes: [{ valor: "assinatura", rotulo: "Na assinatura do contrato" }, { valor: "liquidacao", rotulo: "Na liquidação financeira" }, { valor: "proporcional", rotulo: "Proporcional a cada parcela recebida" }] },
      { chave: "prazoPagamentoDias", rotulo: "Prazo para pagar (dias)", tipo: "numero", padrao: 5 },
      { chave: "rateio", rotulo: "Rateio entre intermediários", tipo: "area", ajuda: "Deixe em branco para usar os percentuais cadastrados em cada parte." },
    ],
    exigeTestemunhas: true,
    ordem: 110,
  },
  {
    chave: "TERMO_QUITACAO",
    nome: "Termo de Quitação",
    paraQueServe: "Encerra a operação declarando que tudo foi pago e nada mais é devido entre as partes.",
    papeisObrigatorios: ["CEDENTE", "CESSIONARIO"],
    papeisOpcionais: ["INTERMEDIARIO", "TESTEMUNHA"],
    baseLegal: ["Código Civil, arts. 319 a 324 (quitação)"],
    campos: [
      { chave: "valorRecebido", rotulo: "Valor total recebido", tipo: "moeda", obrigatorio: true },
      { chave: "dataRecebimento", rotulo: "Data do recebimento", tipo: "data" },
      { chave: "ressalvas", rotulo: "Ressalvas", tipo: "area", ajuda: "Deixe em branco para quitação plena, geral e irrevogável." },
    ],
    ordem: 120,
  },

  // -----------------------------------------------------------------
  // 5. COMPLIANCE
  // -----------------------------------------------------------------
  {
    chave: "DECLARACAO_ORIGEM",
    nome: "Declaração de Origem Lícita de Recursos",
    paraQueServe:
      "A parte declara de onde vem o dinheiro e assume responsabilidade por isso. É o documento que sustenta a operação numa fiscalização.",
    papeisObrigatorios: ["CESSIONARIO"],
    papeisOpcionais: ["CEDENTE", "INVESTIDOR"],
    baseLegal: ["Lei 9.613/1998 (lavagem de dinheiro)", "Lei 12.683/2012", "Circular COAF/BCB aplicável ao setor"],
    campos: [
      { chave: "origemRecursos", rotulo: "Origem dos recursos", tipo: "area", obrigatorio: true },
      { chave: "pep", rotulo: "É pessoa exposta politicamente?", tipo: "opcao", padrao: "nao", opcoes: [{ valor: "nao", rotulo: "Não" }, { valor: "sim", rotulo: "Sim" }] },
    ],
    ordem: 130,
  },
  {
    chave: "FICHA_KYC",
    nome: "Ficha de Conheça Seu Cliente (KYC)",
    paraQueServe:
      "Reúne num documento só a identificação completa da parte, o que foi conferido e o resultado da auditoria. É o que se mostra quando perguntam se houve diligência.",
    papeisObrigatorios: [],
    papeisOpcionais: ["CEDENTE", "CESSIONARIO", "INTERMEDIARIO", "INVESTIDOR"],
    baseLegal: ["Lei 9.613/1998, art. 10", "Lei 13.709/2018 (LGPD), arts. 7º e 9º"],
    campos: [
      { chave: "finalidade", rotulo: "Finalidade da coleta", tipo: "texto", padrao: "Análise de contraparte em operação de cessão de ativos" },
    ],
    ordem: 140,
  },
  {
    chave: "RELATORIO_DILIGENCIA",
    nome: "Relatório de Due Diligence",
    paraQueServe:
      "Consolida num documento assinado tudo o que a auditoria encontrou sobre as partes e sobre o ativo — e, " +
      "com o mesmo destaque, o que não foi possível verificar. É o que se entrega ao comprador, ao investidor " +
      "ou ao comitê que precisa decidir.",
    papeisObrigatorios: [],
    papeisOpcionais: ["CEDENTE", "CESSIONARIO", "INTERMEDIARIO", "GARANTIDOR", "INVESTIDOR"],
    baseLegal: [
      "Lei 9.613/1998, art. 10 (conheça seu cliente)",
      "Código Civil, art. 422 (boa-fé objetiva nas tratativas)",
      "Lei 13.709/2018, arts. 7º e 9º (tratamento de dados)",
    ],
    campos: [
      { chave: "solicitante", rotulo: "Solicitante do relatório", tipo: "texto", ajuda: "Quem pediu a análise. Em branco, usa o nome da sua empresa." },
      { chave: "responsavelNome", rotulo: "Quem assina o relatório", tipo: "texto", obrigatorio: true },
      { chave: "responsavelCargo", rotulo: "Cargo de quem assina", tipo: "texto", padrao: "Responsável pela análise de contraparte" },
      { chave: "responsavelRegistro", rotulo: "Registro profissional", tipo: "texto", ajuda: "OAB, CRC ou outro, quando houver." },
      { chave: "validadeDias", rotulo: "Validade do relatório (dias)", tipo: "numero", padrao: 30 },
    ],
    alerta:
      "Relatório assinado é documento pelo qual alguém responde. Confira cada achado antes de assinar, e não " +
      "remova a seção que diz o que não foi verificado — é ela que delimita a sua responsabilidade.",
    ordem: 145,
  },
  {
    chave: "ADITIVO",
    nome: "Termo Aditivo",
    paraQueServe: "Altera um contrato já assinado sem refazê-lo do zero.",
    papeisObrigatorios: ["CEDENTE", "CESSIONARIO"],
    papeisOpcionais: ["INTERMEDIARIO", "TESTEMUNHA"],
    baseLegal: ["Código Civil, art. 472 (distrato e alteração na mesma forma)"],
    campos: [
      { chave: "contratoOriginal", rotulo: "Contrato que está sendo alterado", tipo: "texto", obrigatorio: true },
      { chave: "dataOriginal", rotulo: "Data do contrato original", tipo: "data" },
      { chave: "alteracoes", rotulo: "O que muda", tipo: "area", obrigatorio: true },
    ],
    exigeTestemunhas: true,
    ordem: 150,
  },
  {
    chave: "DISTRATO",
    nome: "Distrato",
    paraQueServe: "Desfaz um contrato de comum acordo, definindo o que cada um devolve.",
    papeisObrigatorios: ["CEDENTE", "CESSIONARIO"],
    papeisOpcionais: ["INTERMEDIARIO", "TESTEMUNHA"],
    baseLegal: ["Código Civil, art. 472"],
    campos: [
      { chave: "contratoOriginal", rotulo: "Contrato desfeito", tipo: "texto", obrigatorio: true },
      { chave: "dataOriginal", rotulo: "Data do contrato", tipo: "data" },
      { chave: "acertos", rotulo: "Devoluções e acertos", tipo: "area", obrigatorio: true },
    ],
    exigeTestemunhas: true,
    ordem: 160,
  },

  // -----------------------------------------------------------------
  // 9. LICITAÇÃO — habilitação do participante
  // -----------------------------------------------------------------
  // As cinco declarações abaixo pedem os mesmos três dados do certame
  // (órgão, modalidade, número). Escrever o bloco cinco vezes seria
  // repetição — CAMPOS_CERTAME é montado uma vez e espalhado em cada uma.

  {
    chave: "LICIT_CREDENCIAMENTO",
    nome: "Termo de Credenciamento",
    paraQueServe:
      "Autoriza a pessoa que vai representar a empresa na sessão do certame — quem pode dar lance, negociar preço e desistir de recurso em nome dela.",
    papeisObrigatorios: [],
    exigeLicitante: true,
    baseLegal: ["Lei nº 8.666/1993, art. 27; Lei nº 14.133/2021, art. 62"],
    campos: [
      ...CAMPOS_CERTAME,
      { chave: "nomeCredenciado", rotulo: "Nome de quem vai representar a empresa", tipo: "texto", ajuda: "Em branco, usa o representante legal cadastrado." },
      { chave: "rgCredenciado", rotulo: "RG de quem representa", tipo: "texto" },
      { chave: "cpfCredenciado", rotulo: "CPF de quem representa", tipo: "texto" },
    ],
    ordem: 170,
  },
  {
    chave: "LICIT_FATO_SUPERVENIENTE",
    nome: "Declaração de Inexistência de Fato Superveniente Impeditivo",
    paraQueServe: "Declara que nada mudou na empresa, desde que ela se cadastrou, que a impeça de ser habilitada.",
    papeisObrigatorios: [],
    exigeLicitante: true,
    baseLegal: ["Lei nº 8.666/1993, art. 32, § 2º; Lei nº 14.133/2021, art. 63, § 4º"],
    campos: CAMPOS_CERTAME,
    ordem: 171,
  },
  {
    chave: "LICIT_NAO_EMPREGA_MENOR",
    nome: "Declaração de Que Não Emprega Menores",
    paraQueServe: "Declaração exigida em praticamente todo edital, sobre não empregar menor em trabalho noturno, perigoso, insalubre, ou menor de 16 anos salvo aprendiz.",
    papeisObrigatorios: [],
    exigeLicitante: true,
    baseLegal: ["Constituição Federal, art. 7º, XXXIII", "Lei nº 9.854/1999"],
    campos: CAMPOS_CERTAME,
    ordem: 172,
  },
  {
    chave: "LICIT_PLENO_ATENDIMENTO",
    nome: "Declaração de Pleno Atendimento aos Requisitos de Habilitação",
    paraQueServe: "Declaração de que a empresa atende a tudo que o edital exige — exigida antes mesmo de abrir os envelopes, em pregão.",
    papeisObrigatorios: [],
    exigeLicitante: true,
    baseLegal: ["Lei nº 10.520/2002, art. 4º, VII"],
    campos: CAMPOS_CERTAME,
    ordem: 173,
  },
  {
    chave: "LICIT_ME_EPP",
    nome: "Declaração de Microempresa ou Empresa de Pequeno Porte",
    paraQueServe: "Só para quem se enquadra: dá direito a desempate favorável e a prazo extra para regularizar pendência fiscal.",
    papeisObrigatorios: [],
    exigeLicitante: true,
    baseLegal: ["Lei Complementar nº 123/2006, art. 3º, com as alterações da Lei Complementar nº 147/2014"],
    campos: CAMPOS_CERTAME,
    alerta: "Só gere esta declaração se a empresa realmente se enquadra como ME ou EPP. Declaração falsa sujeita a empresa às penas da lei.",
    ordem: 174,
  },
];

export const CATALOGO_POR_CHAVE = Object.fromEntries(CATALOGO.map((d) => [d.chave, d])) as Record<string, TipoDocumento>;

export function documentosOrdenados(): TipoDocumento[] {
  return [...CATALOGO].sort((a, b) => a.ordem - b.ordem);
}
