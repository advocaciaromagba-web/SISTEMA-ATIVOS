/**
 * Catálogo do que se compra por unidade.
 *
 * Duas situações levam ao avulso, e as duas precisam existir:
 *
 *  1. Quem NÃO assina. Faz duas operações por ano e não vai pagar mensalidade,
 *     mas paga por uma due diligence quando o negócio aparece. Recusar essa
 *     venda é recusar dinheiro e perder o assinante futuro.
 *  2. Quem assina e estourou o incluído no plano. Comprar cinco consultas
 *     extras é melhor, para os dois lados, do que ser empurrado para a faixa
 *     de cima por causa de um mês atípico.
 *
 * Por isso o mesmo item aparece nos dois lugares: como cota dentro do plano e
 * como compra avulsa aqui.
 */

export type ItemAvulso = {
  chave: string;
  nome: string;
  descricao: string;
  preco: number;
  /** Em que unidade o preço é cobrado. */
  unidade: string;
  /** Grupo na tela: consulta imediata ou serviço com prazo. */
  grupo: "CONSULTA" | "SERVICO" | "CREDITO";
  /** Dias úteis prometidos. Zero = entrega imediata. */
  prazoUteis: number;
  /** Precisa apontar a parte a que se refere. */
  exigeParte?: boolean;
  /** Precisa apontar a operação. */
  exigeOperacao?: boolean;
  /** O que o comprador recebe. */
  entrega: string;
  /** Quando o item depende de algo que ainda não está contratado. */
  requer?: string;
};

export const AVULSOS: ItemAvulso[] = [
  // ------------------------------------------------------------------
  // Consultas — resultado na hora
  // ------------------------------------------------------------------
  {
    chave: "CONSULTA_BUREAU",
    nome: "Consulta a bureau de crédito",
    descricao:
      "Protestos, pendências financeiras, dívida ativa, cheques sem fundo, ações judiciais, falência e " +
      "recuperação judicial. É a única fonte que enxerga restrição financeira e a única que alcança pessoa física.",
    preco: 29,
    unidade: "consulta",
    grupo: "CONSULTA",
    prazoUteis: 0,
    exigeParte: true,
    entrega: "Resultado no dossiê da parte, na hora, com a resposta bruta arquivada como prova.",
    requer: "Contrato com bureau ativo na plataforma.",
  },
  {
    chave: "AUDITORIA_AVULSA",
    nome: "Auditoria de uma parte",
    descricao:
      "Receita Federal, dívida ativa da União, sanções internacionais, cadastros de empresas punidas, tempo de " +
      "existência e conferência de quem tem poder para assinar.",
    preco: 39,
    unidade: "parte",
    grupo: "CONSULTA",
    prazoUteis: 0,
    exigeParte: true,
    entrega: "Dossiê completo na tela, com parecer e a indicação do que não foi possível verificar.",
  },
  {
    chave: "ANALISE_PROCESSO",
    nome: "Análise de processo judicial",
    descricao:
      "A partir do número do processo: tribunal, classe, assunto, toda a movimentação e a leitura do que ela " +
      "significa para a operação, com os riscos apontados.",
    preco: 49,
    unidade: "processo",
    grupo: "CONSULTA",
    prazoUteis: 0,
    exigeOperacao: true,
    entrega: "Resumo, fase, riscos e sinais de penhora ou cessão já averbada.",
  },
  {
    chave: "LEITURA_DOCUMENTOS",
    nome: "Leitura de documentos",
    descricao:
      "Envie RG, contrato social, cartão CNPJ ou ofício requisitório e receba os campos extraídos para " +
      "conferência — inclusive o ano orçamentário do precatório.",
    preco: 19,
    unidade: "lote de até 6 arquivos",
    grupo: "CONSULTA",
    prazoUteis: 0,
    entrega: "Campos preenchidos na tela, com grau de confiança e documento de origem.",
  },

  // ------------------------------------------------------------------
  // Serviços — com prazo e laudo assinado
  // ------------------------------------------------------------------
  {
    chave: "DILIGENCIA_BASICA",
    nome: "Relatório de contraparte",
    descricao: "Uma parte verificada nas fontes públicas, com parecer assinado por responsável identificado.",
    preco: 490,
    unidade: "relatório",
    grupo: "SERVICO",
    prazoUteis: 3,
    exigeParte: true,
    entrega: "Relatório assinado, com escopo declarado, achados, o que não foi verificado e prazo de validade.",
  },
  {
    chave: "DILIGENCIA_COMPLETA",
    nome: "Due diligence da operação",
    descricao:
      "Até três partes e o ativo: certidões conferidas uma a uma, bureau de crédito, análise do processo de " +
      "origem e matriz de risco.",
    preco: 1900,
    unidade: "operação",
    grupo: "SERVICO",
    prazoUteis: 5,
    exigeOperacao: true,
    entrega: "Relatório assinado com todas as partes, o ativo e a recomendação de garantias.",
  },
  {
    chave: "DILIGENCIA_EXPRESSA",
    nome: "Due diligence expressa",
    descricao: "A mesma due diligence da operação, com prioridade na fila e entrega em 24 horas úteis.",
    preco: 3200,
    unidade: "operação",
    grupo: "SERVICO",
    prazoUteis: 1,
    exigeOperacao: true,
    entrega: "Relatório assinado em 24 horas úteis a partir do envio completo dos documentos.",
  },

  // ------------------------------------------------------------------
  // Créditos — para quem prefere comprar antes
  // ------------------------------------------------------------------
  {
    chave: "PACOTE_ASSINATURAS",
    nome: "Pacote de 10 assinaturas eletrônicas",
    descricao: "Assinatura com validade jurídica, para os documentos gerados na plataforma.",
    preco: 79,
    unidade: "pacote",
    grupo: "CREDITO",
    prazoUteis: 0,
    entrega: "10 créditos de assinatura, sem prazo para usar.",
    requer: "Conta de assinatura eletrônica configurada.",
  },
  {
    chave: "PACOTE_LEITURAS",
    nome: "Pacote de 25 leituras de documento",
    descricao: "Créditos para a leitura automática de documentos e certidões.",
    preco: 89,
    unidade: "pacote",
    grupo: "CREDITO",
    prazoUteis: 0,
    entrega: "25 créditos de leitura, sem prazo para usar.",
  },
];

export const AVULSO_POR_CHAVE = Object.fromEntries(AVULSOS.map((a) => [a.chave, a])) as Record<string, ItemAvulso>;

export const ROTULO_GRUPO: Record<ItemAvulso["grupo"], string> = {
  CONSULTA: "Consultas — resultado na hora",
  SERVICO: "Serviços com laudo assinado",
  CREDITO: "Créditos para usar quando quiser",
};

export const ROTULO_SITUACAO: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "aguardando pagamento",
  PAGO: "pago",
  EM_EXECUCAO: "em execução",
  ENTREGUE: "entregue",
  CANCELADO: "cancelado",
  ESTORNADO: "estornado",
};

/**
 * Data prometida de entrega, contando só dias úteis.
 *
 * Feriado não entra na conta — é aproximação deliberada: prometer com folga e
 * entregar antes é melhor que o contrário. Quando a plataforma tiver calendário
 * de feriados, é aqui que ele entra.
 */
export function prazoDeEntrega(prazoUteis: number, de: Date = new Date()): Date {
  if (prazoUteis <= 0) return de;

  const data = new Date(de.getTime());
  let restantes = prazoUteis;

  while (restantes > 0) {
    data.setDate(data.getDate() + 1);
    const dia = data.getDay();
    if (dia !== 0 && dia !== 6) restantes -= 1;
  }

  return data;
}

/** Competência do mês corrente, no formato usado pelo consumo. */
export function competenciaAtual(data: Date = new Date()): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}
