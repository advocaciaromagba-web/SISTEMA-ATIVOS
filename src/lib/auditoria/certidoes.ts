/**
 * Certidões exigidas de cada parte.
 *
 * POR QUE ISTO EXISTE EM VEZ DE UMA CONSULTA AUTOMÁTICA
 *
 * Nenhuma base criminal pública do Brasil é consultável por programa:
 *   - BNMP (mandados de prisão): a API responde, mas exige autenticação que o
 *     CNJ não fornece publicamente;
 *   - Polícia Federal (antecedentes): protegida por bloqueio anti-robô;
 *   - improbidade administrativa (CNJ) e distribuições dos tribunais: captcha.
 *
 * Quem "automatiza antecedentes" são bureaus pagos, que compraram acesso e
 * revendem. Enquanto não houver contrato, o caminho honesto é este: dizer
 * exatamente qual certidão exigir, de quem, onde tirar, quanto tempo vale — e
 * travar a operação enquanto faltar.
 *
 * O sistema guarda o arquivo, o prazo de validade e o que a certidão revelou.
 */

export type NaturezaApontamento =
  | "NENHUMA"
  | "PROCESSO_EM_CURSO"
  | "CONDENACAO_TRANSITADA"
  | "MANDADO_ABERTO"
  | "MEDIDA_CONSTRITIVA"
  | "OUTRO";

export const ROTULO_NATUREZA: Record<NaturezaApontamento, string> = {
  NENHUMA: "Nada relevante",
  PROCESSO_EM_CURSO: "Processo em curso (sem trânsito em julgado)",
  CONDENACAO_TRANSITADA: "Condenação transitada em julgado",
  MANDADO_ABERTO: "Mandado de prisão em aberto",
  MEDIDA_CONSTRITIVA: "Bem sob constrição (sequestro, indisponibilidade, penhora)",
  OUTRO: "Outro apontamento",
};

export type TipoCertidao = {
  chave: string;
  nome: string;
  orgao: string;
  /** Em que assunto ela entra. */
  eixo: "CRIMINAL" | "PATRIMONIAL" | "FISCAL" | "TRABALHISTA" | "ATIVO";
  /** Explicação de por que ela importa nesta operação. */
  porQue: string;
  /** Onde tirar. Quando é por tribunal, o endereço depende da UF. */
  comoObter: string;
  url?: string;
  /** Quantos dias a certidão continua servindo. */
  validadeDias: number;
  /** Só faz sentido para pessoa física, jurídica, ou ambas. */
  aplicaA: "PF" | "PJ" | "AMBAS";
};

export const CATALOGO_CERTIDOES: TipoCertidao[] = [
  // ------------------------------------------------------------------
  // CRIMINAL
  // ------------------------------------------------------------------
  {
    chave: "ANTECEDENTES_PF",
    nome: "Certidão de Antecedentes Criminais",
    orgao: "Polícia Federal",
    eixo: "CRIMINAL",
    porQue:
      "Mostra registro criminal em âmbito nacional. Numa cessão de crédito, condenação por estelionato, " +
      "falsidade ou lavagem muda a leitura de toda a operação.",
    comoObter: "Emissão gratuita e imediata no site da Polícia Federal, com nome, filiação e documento.",
    url: "https://servicos.pf.gov.br/epol-sinic-publico/",
    validadeDias: 90,
    aplicaA: "PF",
  },
  {
    chave: "DISTRIBUICAO_CRIMINAL_ESTADUAL",
    nome: "Certidão de Distribuição Criminal — Justiça Estadual",
    orgao: "Tribunal de Justiça do estado de domicílio",
    eixo: "CRIMINAL",
    porQue:
      "Revela ações penais em curso no estado onde a parte mora. Processo em curso não é condenação, mas " +
      "processo por crime patrimonial durante uma cessão de crédito é fato que precisa ser conhecido.",
    comoObter: "No portal de certidões do Tribunal de Justiça do estado de domicílio da parte.",
    validadeDias: 90,
    aplicaA: "AMBAS",
  },
  {
    chave: "DISTRIBUICAO_CRIMINAL_FEDERAL",
    nome: "Certidão de Distribuição Criminal — Justiça Federal",
    orgao: "Tribunal Regional Federal da região",
    eixo: "CRIMINAL",
    porQue:
      "Crimes contra o sistema financeiro, lavagem de dinheiro e fraudes contra a União correm na Justiça " +
      "Federal e não aparecem na certidão estadual.",
    comoObter: "No site do Tribunal Regional Federal correspondente ao domicílio da parte.",
    validadeDias: 90,
    aplicaA: "AMBAS",
  },
  {
    chave: "BNMP_MANDADO",
    nome: "Consulta ao Banco Nacional de Mandados de Prisão",
    orgao: "Conselho Nacional de Justiça",
    eixo: "CRIMINAL",
    porQue:
      "Mandado de prisão em aberto significa que a parte pode ser presa a qualquer momento. Assinar contrato, " +
      "escritura ou procuração com quem está foragido compromete a operação inteira e levanta suspeita de " +
      "ocultação de patrimônio.",
    comoObter:
      "Consulta pública no Portal BNMP do CNJ, por nome ou documento. Imprima o resultado em PDF, mesmo quando " +
      "nada constar.",
    url: "https://portalbnmp.cnj.jus.br/",
    validadeDias: 30,
    aplicaA: "PF",
  },
  {
    chave: "IMPROBIDADE_CNJ",
    nome: "Certidão de Improbidade Administrativa e Inelegibilidade",
    orgao: "Conselho Nacional de Justiça",
    eixo: "CRIMINAL",
    porQue:
      "Condenação por improbidade costuma vir acompanhada de indisponibilidade de bens — que pode alcançar " +
      "justamente o crédito que se pretende ceder.",
    comoObter: "Consulta gratuita no site do CNJ, por CPF ou CNPJ.",
    url: "https://www.cnj.jus.br/improbidade_adm/consultar_requerido.php",
    validadeDias: 90,
    aplicaA: "AMBAS",
  },

  // ------------------------------------------------------------------
  // PATRIMONIAL
  // ------------------------------------------------------------------
  {
    chave: "DISTRIBUICAO_CIVEL",
    nome: "Certidão de Distribuição Cível e de Execuções",
    orgao: "Tribunal de Justiça do estado de domicílio",
    eixo: "PATRIMONIAL",
    porQue:
      "Execuções em curso contra o cedente podem levar à penhora do crédito antes que a cessão produza efeito. " +
      "É o risco mais concreto de perder o ativo depois de pagar.",
    comoObter: "No portal de certidões do Tribunal de Justiça do estado de domicílio.",
    validadeDias: 90,
    aplicaA: "AMBAS",
  },
  {
    chave: "FALENCIA_RECUPERACAO",
    nome: "Certidão de Falência, Recuperação Judicial e Concordata",
    orgao: "Tribunal de Justiça do estado da sede",
    eixo: "PATRIMONIAL",
    porQue:
      "Empresa em recuperação judicial não dispõe livremente do próprio patrimônio: a cessão pode depender de " +
      "autorização do juízo da recuperação, e sem ela o negócio é anulável.",
    comoObter: "No portal de certidões do Tribunal de Justiça do estado da sede.",
    validadeDias: 90,
    aplicaA: "PJ",
  },
  {
    chave: "PROTESTO",
    nome: "Certidão de Protesto",
    orgao: "Cartórios de protesto (CENPROT)",
    eixo: "PATRIMONIAL",
    porQue: "Protesto é dívida vencida reconhecida em cartório — o sinal mais direto de dificuldade de pagamento.",
    comoObter: "Consulta na Central Nacional de Protesto, por CPF ou CNPJ.",
    url: "https://site.cenprotnacional.org.br/",
    validadeDias: 30,
    aplicaA: "AMBAS",
  },

  // ------------------------------------------------------------------
  // FISCAL E TRABALHISTA
  // ------------------------------------------------------------------
  {
    chave: "CND_FEDERAL",
    nome: "Certidão Negativa de Débitos Federais",
    orgao: "Receita Federal e PGFN",
    eixo: "FISCAL",
    porQue:
      "Débito inscrito em dívida ativa pode alcançar o crédito por compensação ou penhora, e é exigência comum " +
      "do tribunal na habilitação do cessionário.",
    comoObter: "Emissão gratuita no site da Receita Federal.",
    url: "https://servicos.receita.fazenda.gov.br/servicos/certidaointernet/",
    validadeDias: 180,
    aplicaA: "AMBAS",
  },
  {
    chave: "CNDT",
    nome: "Certidão Negativa de Débitos Trabalhistas",
    orgao: "Tribunal Superior do Trabalho",
    eixo: "TRABALHISTA",
    porQue: "Débito trabalhista tem preferência sobre quase todos os outros e pode bloquear o crédito.",
    comoObter: "Emissão gratuita e imediata no site do TST.",
    url: "https://cndt-certidao.tst.jus.br/",
    validadeDias: 180,
    aplicaA: "AMBAS",
  },

  // ------------------------------------------------------------------
  // O PRÓPRIO ATIVO
  // ------------------------------------------------------------------
  {
    chave: "OBJETO_E_PE",
    nome: "Certidão de Objeto e Pé do processo de origem",
    orgao: "Vara ou tribunal de origem",
    eixo: "ATIVO",
    porQue:
      "É a única prova de que o crédito existe, de quanto é, de quem é titular e de que não foi cedido, " +
      "penhorado ou bloqueado antes. Sem ela, compra-se um número.",
    comoObter: "Requerimento na vara de origem ou pelo portal do tribunal, informando o número do processo.",
    validadeDias: 60,
    aplicaA: "AMBAS",
  },
  {
    chave: "CERTIDAO_PRECATORIO",
    nome: "Certidão de Situação do Precatório",
    orgao: "Tribunal onde o precatório está inscrito",
    eixo: "ATIVO",
    porQue:
      "Mostra a ordem cronológica, o ano orçamentário, cessões já averbadas, penhoras no rosto dos autos e " +
      "eventual compensação com débitos do titular. É onde aparece a cessão dupla.",
    comoObter: "Setor de precatórios do tribunal de origem.",
    validadeDias: 60,
    aplicaA: "AMBAS",
  },
];

export const CERTIDAO_POR_CHAVE = Object.fromEntries(
  CATALOGO_CERTIDOES.map((c) => [c.chave, c])
) as Record<string, TipoCertidao>;

// ---------------------------------------------------------------------
// Quem precisa apresentar o quê
// ---------------------------------------------------------------------

/** Ativos cujo risco criminal é próprio do negócio, não acessório. */
const ATIVOS_JUDICIAIS = ["PRECATORIO", "DIREITO_CREDITORIO", "CREDITO_RURAL"];

export type ExigenciaCertidao = {
  tipo: TipoCertidao;
  obrigatoria: boolean;
  motivo: string;
};

/**
 * Monta a lista de certidões exigidas de uma parte, conforme o papel dela e o
 * tipo de ativo.
 *
 * O cedente é quem recebe a exigência pesada: é o patrimônio dele que está
 * sendo transferido, e é contra ele que existem as constrições que podem
 * derrubar a cessão depois de paga.
 */
export function exigenciasDe(params: {
  tipoPessoa: "PF" | "PJ";
  papel: string;
  tipoAtivo: string | null;
}): ExigenciaCertidao[] {
  const { tipoPessoa, papel, tipoAtivo } = params;

  const ehJudicial = tipoAtivo != null && ATIVOS_JUDICIAIS.includes(tipoAtivo);
  const ehPrecatorio = tipoAtivo === "PRECATORIO";

  const cabe = (c: TipoCertidao) => c.aplicaA === "AMBAS" || c.aplicaA === tipoPessoa;

  const exigencias: ExigenciaCertidao[] = [];
  const incluir = (chave: string, obrigatoria: boolean, motivo: string) => {
    const tipo = CERTIDAO_POR_CHAVE[chave];
    if (!tipo || !cabe(tipo)) return;
    exigencias.push({ tipo, obrigatoria, motivo });
  };

  if (papel === "CEDENTE") {
    // Criminal é obrigatório em ativo judicial: é o desenho clássico de quem
    // tenta tirar patrimônio do alcance da Justiça antes que ela o alcance.
    incluir(
      "ANTECEDENTES_PF",
      ehJudicial,
      ehJudicial
        ? "Cedente de crédito judicial: registro criminal é exigência da operação."
        : "Recomendada para conhecer a contraparte."
    );
    incluir(
      "BNMP_MANDADO",
      ehJudicial,
      ehJudicial
        ? "Mandado de prisão em aberto compromete a assinatura e sugere ocultação de patrimônio."
        : "Recomendada."
    );
    incluir("DISTRIBUICAO_CRIMINAL_ESTADUAL", ehJudicial, "Ações penais no estado de domicílio.");
    incluir("DISTRIBUICAO_CRIMINAL_FEDERAL", ehJudicial, "Lavagem e crimes financeiros correm na Justiça Federal.");
    incluir("IMPROBIDADE_CNJ", ehJudicial, "Improbidade costuma vir com indisponibilidade de bens.");
    incluir("DISTRIBUICAO_CIVEL", true, "Execuções contra o cedente podem penhorar o crédito antes da cessão.");
    incluir("FALENCIA_RECUPERACAO", true, "Recuperação judicial limita a disponibilidade do patrimônio.");
    incluir("PROTESTO", false, "Indica dificuldade financeira do cedente.");
    incluir("CND_FEDERAL", ehPrecatorio, "Débito federal pode ser compensado contra o precatório.");
    incluir("CNDT", ehPrecatorio, "Débito trabalhista tem preferência e pode bloquear o crédito.");
    incluir("OBJETO_E_PE", ehJudicial, "Prova de que o crédito existe e de quem é.");
    incluir("CERTIDAO_PRECATORIO", ehPrecatorio, "Mostra cessões já averbadas e penhoras no rosto dos autos.");
  }

  if (papel === "CESSIONARIO" || papel === "INVESTIDOR") {
    // Do comprador interessa a origem do dinheiro e a idoneidade, não o
    // histórico patrimonial completo — ele não está entregando o ativo.
    incluir("ANTECEDENTES_PF", false, "Conhecimento da contraparte (PLD/FT).");
    incluir("IMPROBIDADE_CNJ", false, "Conhecimento da contraparte.");
    incluir("CND_FEDERAL", ehPrecatorio, "O tribunal costuma exigir do cessionário na habilitação.");
    incluir("CNDT", false, "Complementa a análise de regularidade.");
  }

  if (papel === "INTERMEDIARIO") {
    incluir("ANTECEDENTES_PF", ehJudicial, "Quem intermedeia responde pela apresentação que faz.");
    incluir("IMPROBIDADE_CNJ", false, "Conhecimento da cadeia de intermediação.");
  }

  if (papel === "GARANTIDOR") {
    incluir("DISTRIBUICAO_CIVEL", true, "A garantia só vale se o garantidor tiver patrimônio livre.");
    incluir("PROTESTO", true, "Garantidor protestado não é garantia.");
    incluir("FALENCIA_RECUPERACAO", true, "Garantidor em recuperação não garante.");
  }

  return exigencias;
}

/** A certidão ainda serve? */
export function certidaoValida(validaAte: Date | null, emitidaEm: Date | null, validadeDias: number): boolean {
  const limite = validaAte ?? (emitidaEm ? new Date(emitidaEm.getTime() + validadeDias * 86400000) : null);
  if (!limite) return false;
  return limite.getTime() > Date.now();
}
