/**
 * Catálogo das soluções que a plataforma oferece.
 *
 * A plataforma não é um site de intermediação de ativos com alguns extras. É
 * um conjunto de soluções para o mercado de ativos financeiros e commodities,
 * e o centro dele é compliance de empresas e due diligence de pessoas — saber
 * com quem se está tratando antes de assinar. A gestão de operações é uma das
 * soluções, não o produto inteiro.
 *
 * Cada entrada declara quatro coisas que o comprador precisa saber antes de
 * pagar: para quem serve, o que ele entrega de entrada, o que recebe de volta,
 * e em que fontes isso foi apurado.
 *
 * E declara uma quinta, que quase nenhum concorrente declara: o `estado`. Uma
 * plataforma que vende verificação não pode anunciar como pronto o que ainda
 * está sendo construído — seria, no próprio produto, o tipo de afirmação que a
 * auditoria dela aponta como risco numa contraparte.
 */

export type EstadoSolucao = "DISPONIVEL" | "PARCIAL" | "EM_CONSTRUCAO";

export type Solucao = {
  chave: string;
  nome: string;
  /** Uma linha, para o menu e o cartão. */
  resumo: string;
  /** Quem compra isto e por quê. */
  paraQuem: string;
  /** O que o cliente informa. */
  entrada: string[];
  /** O que ele recebe. */
  entrega: string[];
  /** Onde a informação foi apurada. */
  fontes: string[];
  estado: EstadoSolucao;
  /**
   * O que esta solução NÃO faz. Escrito no mesmo lugar em que se promete,
   * porque promessa e limite lidos juntos é o que evita cliente frustrado.
   */
  limite: string;
  /** Chave do avulso correspondente, quando há venda unitária. */
  avulso?: string;
};

export const ROTULO_ESTADO: Record<EstadoSolucao, string> = {
  DISPONIVEL: "Disponível",
  PARCIAL: "Parcialmente disponível",
  EM_CONSTRUCAO: "Em construção",
};

export const SOLUCOES: Solucao[] = [
  {
    chave: "COMPLIANCE_EMPRESA",
    nome: "Compliance de empresas",
    resumo: "Saber se a empresa existe, está regular e tem como pagar — antes de assinar.",
    paraQuem:
      "Quem vai contratar, fornecer, comprar de ou investir numa empresa que ainda não conhece. Também para " +
      "quem precisa cumprir política interna de conheça-seu-cliente e registrar a verificação.",
    entrada: ["CNPJ da empresa", "Opcionalmente, os documentos societários que ela apresentou"],
    entrega: [
      "Situação cadastral, data de abertura, capital social, atividade e quadro societário",
      "Dívida ativa da União, com valor e natureza do débito",
      "Débitos trabalhistas reconhecidos em juízo (CNDT)",
      "Protestos em cartório",
      "Presença em cadastros de empresas punidas e em listas internacionais de sanções",
      "Processos judiciais em que a empresa figura, com análise de cada um",
      "Certidões federal, estadual e trabalhista, emitidas e arquivadas com data de validade",
      "Parecer final classificando o risco, assinado por responsável identificado",
    ],
    fontes: [
      "Receita Federal",
      "Procuradoria-Geral da Fazenda Nacional",
      "Controladoria-Geral da União",
      "Tribunal Superior do Trabalho",
      "Institutos de protesto",
      "Secretarias estaduais da Fazenda",
      "Conselho Nacional de Justiça",
      "OFAC — Departamento do Tesouro dos Estados Unidos",
    ],
    estado: "DISPONIVEL",
    limite:
      "A verificação mostra o que as fontes públicas registravam na data da consulta. Não é atestado de " +
      "idoneidade, não prevê comportamento futuro e não substitui auditoria contábil.",
    avulso: "DILIGENCIA_BASICA",
  },

  {
    chave: "DILIGENCIA_PESSOA",
    nome: "Due diligence de pessoas",
    resumo: "Quem é a pessoa física que vai assinar, responder ou receber.",
    paraQuem:
      "Quem precisa conhecer sócios, administradores, procuradores, cedentes e garantidores antes de fechar. " +
      "É a verificação que mais falta e a que mais custa caro quando falha.",
    entrada: ["CPF e data de nascimento", "Opcionalmente, os documentos pessoais apresentados"],
    entrega: [
      "Situação do CPF na Receita Federal",
      "Certidão de antecedentes criminais da Polícia Federal",
      "Consulta ao banco nacional de mandados de prisão",
      "Consulta ao cadastro de condenações por improbidade administrativa",
      "Processos judiciais em que a pessoa figura, com análise de cada um",
      "Certidões cível e criminal, estadual e federal, emitidas e arquivadas",
      "Parecer final, com a distinção entre processo em curso e condenação",
    ],
    fontes: [
      "Receita Federal",
      "Polícia Federal",
      "Conselho Nacional de Justiça",
      "Tribunais de Justiça estaduais",
      "Tribunais Regionais Federais",
      "Superior Tribunal de Justiça",
    ],
    estado: "DISPONIVEL",
    limite:
      "Processo em curso não é condenação (Constituição, art. 5º, LVII, e Súmula 444 do STJ), e o parecer diz " +
      "isso com todas as letras. Algumas certidões dependem de captcha e são obtidas com um clique do operador, " +
      "não sozinhas — o relatório informa quais foram assim.",
    avulso: "DILIGENCIA_BASICA",
  },

  {
    chave: "VERIFICACAO_DOCUMENTOS",
    nome: "Verificação de documentos",
    resumo: "Conferir se a certidão ou o documento apresentado é verdadeiro e ainda vale.",
    paraQuem:
      "Empresa que recebeu documentação de um fornecedor, cliente ou contraparte e precisa saber se aquilo é " +
      "autêntico — em vez de arquivar um PDF e torcer.",
    entrada: ["O documento ou a certidão recebida", "Ou apenas o CPF ou CNPJ, para emitir do zero"],
    entrega: [
      "Leitura do documento e extração dos dados, com cada campo indicando de onde saiu",
      "Reemissão da mesma certidão direto no órgão, quando o órgão permite",
      "Comparação entre o que foi apresentado e o que o órgão responde hoje",
      "Controle de validade, com aviso antes de vencer",
      "Impressão digital de cada arquivo, que prova depois que ele não foi alterado",
    ],
    fontes: [
      "O próprio órgão emissor de cada documento",
      "Receita Federal",
      "Tribunais estaduais e federais",
    ],
    estado: "PARCIAL",
    limite:
      "A leitura, a emissão e o controle de validade já funcionam. A comparação automática entre o documento " +
      "apresentado e a reemissão está sendo construída — hoje o sistema entrega os dois lado a lado para " +
      "conferência humana.",
    avulso: "LEITURA_DOCUMENTOS",
  },

  {
    chave: "LICITACOES",
    nome: "Análise de licitações",
    resumo: "O edital lido e cada participante conferido contra as exigências dele.",
    paraQuem:
      "Prefeituras, autarquias e órgãos que precisam analisar a habilitação dos participantes de uma licitação " +
      "— e empresas que querem conferir a própria documentação antes de entregar.",
    entrada: ["O edital", "A lista de participantes, por CNPJ"],
    entrega: [
      "As exigências de habilitação extraídas do edital, item por item",
      "Cada participante conferido contra cada exigência, com o resultado apontado",
      "As certidões de cada participante emitidas e arquivadas",
      "Relatório consolidado entregue por e-mail",
    ],
    fontes: [
      "O próprio edital",
      "Receita Federal",
      "Procuradoria-Geral da Fazenda Nacional",
      "Controladoria-Geral da União",
      "Tribunal Superior do Trabalho",
      "Tribunais estaduais e federais",
    ],
    estado: "EM_CONSTRUCAO",
    limite:
      "A verificação de cada participante já existe e funciona hoje, uma a uma. O que está sendo construído é a " +
      "leitura do edital, o cruzamento automático em lote e a entrega por e-mail. O relatório apoia a decisão da " +
      "comissão de licitação; não a substitui, nem emite juízo sobre habilitar ou inabilitar.",
  },

  {
    chave: "GESTAO_ATIVOS",
    nome: "Gestão de ativos e operações",
    resumo: "Precatórios, créditos, commodities e metais organizados, com os documentos saindo do cadastro.",
    paraQuem:
      "Quem intermedeia, adquire ou administra ativos financeiros e commodities, e precisa que a papelada " +
      "acompanhe a operação sem ser redigitada a cada etapa.",
    entrada: ["O cadastro da operação e das partes", "Os documentos do ativo"],
    entrega: [
      "Documentos gerados a partir do cadastro, adaptados ao tipo de ativo",
      "Cadeia de intermediação nomeada e protegida no NCNDA",
      "Calculadora de precatório pela legislação vigente, com índices oficiais",
      "Controle das certidões exigidas por ativo, com prazo de validade",
      "Registro de quem fez o quê, e impressão digital em cada documento",
    ],
    fontes: [
      "Banco Central do Brasil, para os índices de atualização",
      "Conselho Nacional de Justiça, para o processo de origem",
      "Receita Federal e demais fontes da verificação de partes",
    ],
    estado: "DISPONIVEL",
    limite:
      "Os documentos são minutas, feitas para revisão por advogado antes da assinatura. A plataforma não é " +
      "escritório de advocacia e não presta consultoria jurídica.",
  },
];

export function solucao(chave: string): Solucao | undefined {
  return SOLUCOES.find((s) => s.chave === chave);
}

/** Só o que já está no ar, para quando a lista precisa ser de coisas prontas. */
export function solucoesDisponiveis(): Solucao[] {
  return SOLUCOES.filter((s) => s.estado !== "EM_CONSTRUCAO");
}
