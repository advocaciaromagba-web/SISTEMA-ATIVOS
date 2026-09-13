/**
 * Mapa dos serviços da Infosimples usados pela plataforma.
 *
 * Os caminhos foram levantados do catálogo público em agosto de 2026 (817
 * consultas, 103 delas em tribunais). Eles seguem o mesmo padrão do endereço
 * do site: `/consultas/tribunal-tjsp-pedido-civel/` corresponde ao caminho
 * `tribunal/tjsp/pedido-civel` na API.
 *
 * DUAS COISAS QUE MUDAM O DESENHO:
 *
 * 1. A cobertura de certidão varia por tribunal. Alguns emitem numa chamada
 *    só; outros — TJSP, TJRJ, TJSC, TJMS, TRF3 — exigem duas etapas: pedir a
 *    certidão e depois retirar o PDF pelo número do pedido. Há tribunais sem
 *    cobertura nenhuma, e para eles o sistema continua pedindo a certidão à
 *    parte, como antes.
 *
 * 2. Certidão cível e criminal nem sempre são serviços separados. Em vários
 *    tribunais sai uma "certidão de nada consta" única, que cobre as duas.
 *    Quando é assim, o mesmo serviço atende as duas exigências do catálogo.
 */

export type ServicoInfosimples = {
  /** Caminho após /api/v2/consultas. */
  caminho: string;
  /** Que documento a consulta aceita. */
  aceita: "CPF" | "CNPJ" | "AMBOS";
  /** Alguns serviços exigem dados extras da pessoa. */
  exigeNomeMae?: boolean;
  exigeDataNascimento?: boolean;
  /**
   * Manda a UF junto. Serviço estadual (SEFAZ) recusa a consulta sem ela —
   * confirmado contra a API em 13/09/2026: sem `uf` devolve código 606
   * ("parâmetros obrigatórios não foram enviados"); com `uf`, emite.
   */
  exigeUf?: boolean;
  /**
   * O órgão só emite para quem está logado no gov.br. A Infosimples repassa
   * o login (`login_cpf`/`login_senha`) ou o certificado digital A1
   * (`pkcs12_cert`/`pkcs12_pass`) — sem um dos pares, devolve 606. É o caso
   * das certidões do TJSP, que a Justiça moveu para dentro do login único.
   */
  exigeGovBr?: boolean;
  /**
   * Quando o tribunal emite em duas etapas: a primeira devolve um número de
   * pedido, e a segunda retira o PDF com ele.
   */
  segundaEtapa?: { caminho: string; campoNumero: string };
  /** O que quem opera precisa saber sobre esta consulta. */
  observacao?: string;
};

// ---------------------------------------------------------------------
// Serviços nacionais — valem para qualquer estado
// ---------------------------------------------------------------------

const NACIONAIS: Record<string, ServicoInfosimples> = {
  BNMP_MANDADO: {
    caminho: "cnj/mandados-prisao",
    aceita: "CPF",
    observacao: "Retorna apenas mandados com situação 'aguardando cumprimento'.",
  },
  IMPROBIDADE_CNJ: {
    caminho: "cnj/improbidade",
    aceita: "AMBOS",
  },
  ANTECEDENTES_PF: {
    caminho: "antecedentes-criminais/pf/emit",
    aceita: "CPF",
    exigeNomeMae: true,
    exigeDataNascimento: true,
    observacao:
      "A Polícia Federal exige nome completo, nome da mãe e data de nascimento. Divergência de qualquer um " +
      "deles faz a emissão falhar.",
  },
  CNDT: {
    caminho: "tribunal/tst/cndt",
    aceita: "AMBOS",
    observacao: "É a consulta ao Banco Nacional de Devedores Trabalhistas.",
  },
  CND_FEDERAL: {
    caminho: "receita-federal/pgfn",
    aceita: "AMBOS",
    // Testado em 13/09/2026 contra três empresas diferentes, inclusive
    // Petrobras e Magazine Luiza: sem credencial gov.br, a Receita responde
    // "informações insuficientes para emitir a certidão pela Internet" para
    // todas — e a consulta é cobrada (R$ 0,30) mesmo falhando. Exigir a
    // credencial antes de chamar evita pagar por uma tentativa perdida.
    exigeGovBr: true,
    observacao:
      "Certidão conjunta da Receita Federal e da PGFN. A Receita moveu a emissão para dentro do gov.br.",
  },
  // PROTESTO saiu daqui de propósito. A Infosimples descontinuou as duas
  // consultas de protesto (IEPTB e CENPROT SP) depois que a central
  // reformulou o site — confirmado no catálogo deles e contra a API em
  // 13/09/2026, que devolve 615 de forma permanente. Mantê-lo no mapa faria
  // o sistema tentar, falhar e cobrar atenção à toa. Enquanto não houver
  // outro fornecedor contratado, protesto é certidão de anexo manual.
  DIVIDA_ATIVA_ESTADUAL: {
    caminho: "sefaz/certidao-debitos",
    aceita: "AMBOS",
    exigeUf: true,
    observacao: "Certidão da SEFAZ do estado da sede — depende da UF cadastrada na empresa.",
  },
  FALENCIA_RECUPERACAO: {
    caminho: "tribunal/tst/banco-falencias",
    aceita: "AMBOS",
    observacao:
      "Banco de falências do TST. Complementa, mas não substitui, a certidão de falência do tribunal do estado " +
      "da sede.",
  },
};

// ---------------------------------------------------------------------
// Certidão da Justiça Estadual, por unidade da federação
// ---------------------------------------------------------------------

/**
 * Onde há cobertura, e como.
 *
 * `unica: true` significa que a certidão emitida cobre cível e criminal ao
 * mesmo tempo — é o que a maioria dos tribunais chama de "nada consta".
 */
const ESTADUAL: Record<string, { civel?: ServicoInfosimples; criminal?: ServicoInfosimples; unica?: boolean }> = {
  SP: {
    civel: {
      caminho: "tribunal/tjsp/pedido-civel",
      aceita: "AMBOS",
      exigeGovBr: true,
      segundaEtapa: { caminho: "tribunal/tjsp/obter-certidao", campoNumero: "numero_pedido" },
    },
    criminal: {
      caminho: "tribunal/tjsp/pedido-criminal",
      aceita: "AMBOS",
      exigeGovBr: true,
      segundaEtapa: { caminho: "tribunal/tjsp/obter-certidao", campoNumero: "numero_pedido" },
    },
  },
  RJ: {
    civel: {
      caminho: "tribunal/tjrj/pedido-cert",
      aceita: "AMBOS",
      segundaEtapa: { caminho: "tribunal/tjrj/obter-certidao", campoNumero: "numero_pedido" },
    },
    unica: true,
  },
  SC: {
    civel: {
      caminho: "tribunal/tjsc/pedido-certidao",
      aceita: "AMBOS",
      segundaEtapa: { caminho: "tribunal/tjsc/obter-certidao", campoNumero: "numero_pedido" },
    },
    unica: true,
  },
  MS: {
    civel: {
      caminho: "tribunal/tjms/pedido-cert",
      aceita: "AMBOS",
      segundaEtapa: { caminho: "tribunal/tjms/obter-certidao", campoNumero: "numero_pedido" },
    },
    unica: true,
  },
  DF: { civel: { caminho: "tribunal/tjdf/nada-consta", aceita: "AMBOS" }, unica: true },
  GO: { civel: { caminho: "tribunal/tjgo/nada-consta", aceita: "AMBOS" }, unica: true },
  MA: { civel: { caminho: "tribunal/tjma/nada-consta", aceita: "AMBOS" }, unica: true },
  TO: { civel: { caminho: "tribunal/tjto/cert-judicial", aceita: "AMBOS" }, unica: true },
  PA: { criminal: { caminho: "tribunal/tjpa/cert-criminal", aceita: "AMBOS" } },
};

// ---------------------------------------------------------------------
// Certidão da Justiça Federal, pelo tribunal da região
// ---------------------------------------------------------------------

const TRF_POR_UF: Record<string, number> = {
  AC: 1, AM: 1, AP: 1, BA: 1, DF: 1, GO: 1, MA: 1, MT: 1, PA: 1, PI: 1, RO: 1, RR: 1, TO: 1,
  MG: 6,
  ES: 2, RJ: 2,
  MS: 3, SP: 3,
  PR: 4, RS: 4, SC: 4,
  AL: 5, CE: 5, PB: 5, PE: 5, RN: 5, SE: 5,
};

const FEDERAL_POR_REGIAO: Record<number, ServicoInfosimples> = {
  1: { caminho: "tribunal/trf1/certidao", aceita: "AMBOS" },
  2: { caminho: "tribunal/trf2/certidao", aceita: "AMBOS" },
  3: {
    caminho: "tribunal/trf3/certidao-distr",
    aceita: "AMBOS",
    segundaEtapa: { caminho: "tribunal/trf3/obter-certidao", campoNumero: "numero_pedido" },
  },
  4: { caminho: "tribunal/trf4/certidao", aceita: "AMBOS" },
  5: { caminho: "tribunal/trf5/certidao", aceita: "AMBOS" },
  6: { caminho: "tribunal/trf6/certidao", aceita: "AMBOS" },
};

/** Certidão unificada da Justiça Federal, quando a UF não é conhecida. */
const FEDERAL_UNIFICADA: ServicoInfosimples = {
  caminho: "tribunal/trf/cert-unificada",
  aceita: "AMBOS",
  observacao: "Certidão unificada da Justiça Federal, sem depender da região.",
};

// ---------------------------------------------------------------------
// Resolução
// ---------------------------------------------------------------------

/**
 * Descobre qual serviço atende uma certidão do nosso catálogo, considerando o
 * estado da parte. Devolve null quando não há cobertura — e aí o sistema volta
 * a exigir a certidão da parte.
 */
export function servicoPara(chaveCertidao: string, uf: string | null): ServicoInfosimples | null {
  const estado = (uf ?? "").toUpperCase();

  if (chaveCertidao in NACIONAIS) return NACIONAIS[chaveCertidao];

  if (chaveCertidao === "DISTRIBUICAO_CRIMINAL_FEDERAL") {
    const regiao = estado ? TRF_POR_UF[estado] : null;
    return regiao ? FEDERAL_POR_REGIAO[regiao] : FEDERAL_UNIFICADA;
  }

  if (chaveCertidao === "DISTRIBUICAO_CIVEL" || chaveCertidao === "DISTRIBUICAO_CRIMINAL_ESTADUAL") {
    const cobertura = estado ? ESTADUAL[estado] : null;
    if (!cobertura) return null;

    const criminal = chaveCertidao === "DISTRIBUICAO_CRIMINAL_ESTADUAL";

    // Onde a certidão é única, ela vale para as duas exigências.
    if (cobertura.unica) return cobertura.civel ?? cobertura.criminal ?? null;
    return (criminal ? cobertura.criminal : cobertura.civel) ?? null;
  }

  return null;
}

/** Estados com emissão automática de certidão estadual, para mostrar na tela. */
export function ufsComCoberturaEstadual(): string[] {
  return Object.keys(ESTADUAL).sort();
}
