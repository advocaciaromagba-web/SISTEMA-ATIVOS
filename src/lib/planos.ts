/**
 * Planos de assinatura.
 *
 * COMO OS PREÇOS FORAM PENSADOS
 *
 * O custo real de servir um assinante fica entre R$ 30 e R$ 80 por mês: as
 * fontes que mais importam (Receita Federal, dívida ativa da União, sanções,
 * DataJud) são gratuitas, e o que custa é consumo — leitura de documento por
 * inteligência artificial, assinatura eletrônica e consulta a bureau.
 *
 * O preço não sai só do custo — também sai do valor de UMA operação: um
 * precatório de R$ 900 mil a 2% de comissão rende R$ 18 mil, e qualquer um
 * destes planos se paga com uma única operação no ano. Mas o valor em si foi
 * pensado para ser popular, não para espremer o máximo por assinante — mais
 * gente pagando um preço que não pesa vale mais que pouca gente pagando caro.
 *
 * Por isso os limites são generosos no que é barato (operações, partes,
 * auditoria) e contados no que tem custo por unidade (IA, assinatura, bureau).
 */

export type Plano = {
  chave: string;
  nome: string;
  /** Para quem é, em uma frase. */
  paraQuem: string;
  precoMensal: number;
  /** Cobrado de uma vez, com desconto de dois meses. */
  precoAnual: number;
  destaque?: boolean;

  limites: {
    usuarios: number | null;
    operacoesAtivas: number | null;
    documentosPorMes: number | null;
    leiturasIaPorMes: number;
    assinaturasPorMes: number;
    consultasBureauPorMes: number;
  };

  /** O que o plano entrega, na ordem em que importa para quem decide. */
  inclui: string[];
  /** O que ele não entrega — dito de frente, para não gerar frustração. */
  naoInclui?: string[];
};

export const PLANOS: Plano[] = [
  {
    chave: "ESSENCIAL",
    nome: "Essencial",
    paraQuem: "Para quem trabalha sozinho e fecha poucas operações por ano.",
    precoMensal: 147,
    precoAnual: 1470,
    limites: {
      usuarios: 1,
      operacoesAtivas: 5,
      documentosPorMes: 20,
      leiturasIaPorMes: 0,
      assinaturasPorMes: 0,
      consultasBureauPorMes: 0,
    },
    inclui: [
      "Cadastro de partes com conferência de CPF, CNPJ e número de processo",
      "Operações de precatório, crédito tributário, commodity e outros ativos",
      "Os 16 documentos: NDA, NCNDA, IMFPA, procuração, cessão, notificação e mais",
      "Auditoria automática de idoneidade e capacidade de pagamento",
      "Dívida ativa da União, sanções internacionais e empresas punidas",
      "Controle de certidões com prazo de validade e bloqueio por pendência",
      "Calculadora de precatório com índices oficiais do Banco Central",
      "Registro de auditoria de tudo o que foi feito",
    ],
    naoInclui: ["Leitura de documentos por inteligência artificial", "Assinatura eletrônica inclusa"],
  },

  {
    chave: "PROFISSIONAL",
    nome: "Profissional",
    paraQuem: "Para quem tem operação rodando o mês inteiro e uma equipe pequena.",
    precoMensal: 347,
    precoAnual: 3470,
    destaque: true,
    limites: {
      usuarios: 3,
      operacoesAtivas: 25,
      documentosPorMes: 100,
      leiturasIaPorMes: 100,
      assinaturasPorMes: 20,
      consultasBureauPorMes: 0,
    },
    inclui: [
      "Tudo do Essencial",
      "Leitura de documentos por IA: envie o RG, o contrato social ou o ofício requisitório e o cadastro se preenche",
      "Extração do ano orçamentário (LOA) direto do ofício requisitório",
      "Leitura automática de certidões: resultado, validade e apontamento",
      "20 assinaturas eletrônicas por mês, com validade jurídica",
      "Análise de processo por IA a partir do número, em todos os tribunais",
      "Seu logo no cabeçalho dos documentos gerados",
      "3 usuários com permissões separadas",
    ],
    naoInclui: ["Consultas a bureau de crédito (contratadas à parte)"],
  },

  {
    chave: "MESA",
    nome: "Mesa",
    paraQuem: "Para mesa de operação com volume, equipe e contraparte institucional.",
    precoMensal: 897,
    precoAnual: 8970,
    limites: {
      usuarios: 10,
      operacoesAtivas: null,
      documentosPorMes: null,
      leiturasIaPorMes: 500,
      assinaturasPorMes: 100,
      consultasBureauPorMes: 50,
    },
    inclui: [
      "Tudo do Profissional",
      "Operações e documentos sem limite",
      "500 leituras de documento por mês",
      "100 assinaturas eletrônicas por mês",
      "50 consultas a bureau de crédito por mês (protesto, negativação, recuperação judicial)",
      "10 usuários",
      "Base completa da dívida ativa da União, incluindo tributos federais",
      "Suporte prioritário e treinamento da equipe",
    ],
  },
];

/**
 * Serviços vendidos por operação, não por mês.
 *
 * É o produto de maior margem e o que mais gera confiança: o assinante recebe
 * um relatório assinado, com escopo declarado e as consultas anexadas como
 * prova. O que sustenta o preço não é o trabalho — o sistema faz quase tudo
 * sozinho — é a responsabilidade de quem assina.
 *
 * ATENÇÃO AO DESENHO: relatório assinado é documento pelo qual alguém
 * responde. Todo laudo emitido aqui declara o que foi verificado, o que NÃO
 * foi, a data das consultas e o prazo de validade. Um laudo que diz "nada
 * consta" sem dizer onde olhou é uma promessa que ninguém consegue cumprir.
 */
export type ServicoDiligencia = {
  chave: string;
  nome: string;
  descricao: string;
  preco: number;
  prazoUteis: number;
  abrange: string[];
};

export const SERVICOS: ServicoDiligencia[] = [
  {
    chave: "DILIGENCIA_BASICA",
    nome: "Relatório de contraparte",
    descricao: "Uma parte, checada nas fontes públicas, com parecer assinado.",
    preco: 490,
    prazoUteis: 3,
    abrange: [
      "Cadastro na Receita Federal: situação, porte, capital, quadro societário",
      "Dívida ativa da União",
      "Cadastros de empresas punidas e sanções internacionais",
      "Conferência de que quem assina tem poder para assinar",
      "Parecer assinado, com escopo declarado e prazo de validade",
    ],
  },
  {
    chave: "DILIGENCIA_COMPLETA",
    nome: "Due diligence da operação",
    descricao: "Até três partes e o ativo, com certidões conferidas e análise do processo.",
    preco: 1900,
    prazoUteis: 5,
    abrange: [
      "Tudo do relatório de contraparte, para até três partes",
      "Certidões criminais, cíveis, fiscais e trabalhistas conferidas uma a uma",
      "Consulta a bureau de crédito: protesto, negativação, recuperação judicial",
      "Análise do processo de origem e da situação do precatório",
      "Matriz de risco da operação e recomendação de garantias",
    ],
  },
  {
    chave: "DILIGENCIA_EXPRESSA",
    nome: "Due diligence expressa",
    descricao: "A mesma due diligence completa, entregue em 24 horas úteis.",
    preco: 3200,
    prazoUteis: 1,
    abrange: [
      "Tudo da due diligence da operação",
      "Entrega em 24 horas úteis a partir do envio dos documentos",
      "Prioridade na fila e acompanhamento direto",
    ],
  },
];

/** Cobrado só quando usado, além do que o plano inclui. */
export const ADICIONAIS = [
  { chave: "BUREAU", nome: "Consulta a bureau de crédito", preco: 29, unidade: "consulta" },
  { chave: "ASSINATURA", nome: "Assinatura eletrônica", preco: 9, unidade: "documento" },
  { chave: "LEITURA_IA", nome: "Leitura de documento por IA", preco: 4, unidade: "documento" },
  { chave: "USUARIO", nome: "Usuário adicional", preco: 97, unidade: "mês" },
];

export const DIAS_DE_TESTE = 3;

/**
 * Quantas consultas/auditorias o teste grátis permite, em qualquer solução.
 *
 * O teste é para conhecer a estrutura e ver como sai um resultado — não para
 * sair com um relatório de verdade sem pagar. Por isso soma-se a esta cota
 * uma segunda trava, em código separado: nenhuma solução gera relatório
 * assinado (compliance ou due diligence) enquanto a conta estiver em TESTE,
 * não importa quantas consultas ainda restarem.
 */
export const CONSULTAS_GRATIS_TESTE = 3;

export const PLANO_POR_CHAVE = Object.fromEntries(PLANOS.map((p) => [p.chave, p])) as Record<string, Plano>;

/** Quanto o assinante economiza pagando o ano de uma vez. */
export function economiaAnual(plano: Plano): number {
  return plano.precoMensal * 12 - plano.precoAnual;
}
