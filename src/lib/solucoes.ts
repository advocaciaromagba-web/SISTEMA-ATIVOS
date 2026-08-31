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
    entrada: ["CPF, nome da mãe e data de nascimento", "Opcionalmente, os documentos pessoais apresentados"],
    entrega: [
      "Sanções internacionais e dívida ativa da União",
      "Consulta ao banco nacional de mandados de prisão",
      "Consulta ao cadastro de condenações por improbidade administrativa",
      "Bureau de crédito: protesto, negativação, recuperação judicial",
      "Parecer final, com a distinção entre processo em curso e condenação",
      "Histórico salvo, consultável a qualquer momento",
    ],
    fontes: [
      "OFAC — Departamento do Tesouro dos Estados Unidos",
      "Procuradoria-Geral da Fazenda Nacional",
      "Conselho Nacional de Justiça",
      "Bureau de crédito, quando contratado",
    ],
    estado: "PARCIAL",
    limite:
      "Processo em curso não é condenação (Constituição, art. 5º, LVII, e Súmula 444 do STJ), e o parecer diz " +
      "isso com todas as letras. Mandado de prisão e improbidade exigem nome da mãe e data de nascimento — sem " +
      "eles, a consulta é recusada com aviso. Ainda não incluído: situação do CPF na Receita (não existe hoje " +
      "uma fonte pronta para isso) e emissão de certidão cível/criminal — para esse último, use a solução " +
      "Verificação de Documentos.",
    avulso: "DILIGENCIA_BASICA",
  },

  {
    chave: "VERIFICACAO_DOCUMENTOS",
    nome: "Verificação de documentos",
    resumo: "Conferir se a certidão ou o documento apresentado é verdadeiro e ainda vale.",
    paraQuem:
      "Empresa que recebeu documentação de um fornecedor, cliente ou contraparte e precisa saber se aquilo é " +
      "autêntico — em vez de arquivar um PDF e torcer.",
    entrada: ["O documento recebido (PDF ou imagem)", "Ou apenas o CPF ou CNPJ, para emitir do zero"],
    entrega: [
      "Impressão digital (hash) de cada arquivo, que prova depois que ele não foi alterado",
      "Controle de validade, com aviso antes de vencer",
      "Leitura por IA: tipo de documento, dados principais e validade extraídos automaticamente",
      "Reemissão da mesma certidão direto no órgão, quando o órgão permite",
      "Comparação automática entre o que foi apresentado e o que o órgão responde hoje",
      "Histórico com todos os documentos verificados pela conta",
    ],
    fontes: [
      "O próprio documento enviado, lido por inteligência artificial",
      "Polícia Federal, CNJ, tribunais e demais órgãos com emissão automática via Infosimples",
    ],
    estado: "PARCIAL",
    limite:
      "A impressão digital, o controle de validade e a comparação já funcionam sempre. A leitura automática por " +
      "IA depende de chave configurada; a reemissão automática depende de contrato com o Infosimples e cobre só " +
      "as certidões e estados listados no catálogo — sem isso, o documento continua sendo aceito por upload " +
      "manual, sem o resumo ou a reemissão.",
    avulso: "LEITURA_DOCUMENTOS",
  },

  {
    chave: "LICITACOES",
    nome: "Análise de licitações",
    resumo: "O edital lido, a documentação organizada e o participante conferido — para quem analisa e para quem participa.",
    paraQuem:
      "Serve os dois lados do mesmo certame. Para o ente público — prefeituras, autarquias, órgãos —: recebe a " +
      "documentação de cada participante já organizada, confere a veracidade e a regularidade sem trabalho manual. " +
      "Para quem participa — empresas e prestadores de serviço —: mantém a documentação pronta e reaproveitável " +
      "para concorrer em vários certames, em qualquer município do país, assinando em vez de montar processo do zero " +
      "a cada edital.",
    entrada: [
      "Do ente público: o edital e o CNPJ de cada participante",
      "Do participante: os documentos da empresa, uma vez, mantidos atualizados",
    ],
    entrega: [
      "Para o participante — as cinco declarações padronizadas de habilitação geradas do cadastro: credenciamento, inexistência de fato superveniente, não emprego de menor, pleno atendimento e ME/EPP",
      "Para o participante — a mesma empresa reaproveitada em qualquer certame, só trocando o órgão, a modalidade e o número",
      "Para o ente público — cada participante conferido contra a Receita, a dívida ativa da União, a CNDT e as demais fontes do compliance de empresas",
      "Para o ente público — as exigências de habilitação extraídas do edital, item por item",
      "Para o ente público — relatório consolidado da comissão, entregue por e-mail",
      "Oportunidades publicadas por prefeituras compatíveis com o segmento e a região do participante",
    ],
    fontes: [
      "O próprio edital",
      "Lei nº 8.666/1993 e Lei nº 14.133/2021, para a taxonomia fechada dos requisitos de habilitação",
      "Portal Nacional de Contratações Públicas (PNCP), instituído pela Lei nº 14.133/2021",
      "Receita Federal",
      "Procuradoria-Geral da Fazenda Nacional",
      "Controladoria-Geral da União",
      "Tribunal Superior do Trabalho",
      "Tribunais estaduais e federais",
    ],
    estado: "PARCIAL",
    limite:
      "As cinco declarações e a verificação individual de cada participante já funcionam hoje — a redação foi " +
      "conferida contra um edital real, não inventada. O que está sendo construído é a leitura automática do " +
      "edital, o cruzamento em lote de vários participantes de uma vez, a assinatura pelo gov.br e a busca de " +
      "oportunidades no PNCP. O relatório apoia a decisão da comissão de licitação; não a substitui, nem emite " +
      "juízo sobre habilitar ou inabilitar.",
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

  {
    chave: "CONSULTA_CADASTRAL_SERASA",
    nome: "Consulta cadastral",
    resumo: "Situação, score e restrições de uma pessoa ou empresa, direto na base do SERASA.",
    paraQuem:
      "Quem precisa de uma resposta rápida sobre a situação cadastral de alguém — antes de vender a prazo, " +
      "fechar uma parceria ou aceitar um novo cliente — sem precisar de um relatório completo de due diligence.",
    entrada: ["CPF ou CNPJ da pessoa ou empresa"],
    entrega: [
      "Situação cadastral e score",
      "Restrições: negativação, protesto, ações judiciais",
      "Histórico salvo, consultável a qualquer momento",
    ],
    fontes: ["SERASA"],
    estado: "EM_CONSTRUCAO",
    limite:
      "Ainda não está no ar — falta o contrato com o SERASA. O cadastro, o login e o crédito pré-pago já " +
      "funcionam; a consulta em si passa a responder assim que a integração for ligada.",
  },
];

export function solucao(chave: string): Solucao | undefined {
  return SOLUCOES.find((s) => s.chave === chave);
}

/** Só o que já está no ar, para quando a lista precisa ser de coisas prontas. */
export function solucoesDisponiveis(): Solucao[] {
  return SOLUCOES.filter((s) => s.estado !== "EM_CONSTRUCAO");
}
