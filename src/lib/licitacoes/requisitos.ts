/**
 * Taxonomia dos requisitos de habilitação em licitação pública.
 *
 * Não é uma lista aberta que cada edital inventa do zero. A lei fecha as
 * categorias possíveis — o edital só escolhe QUAIS documentos dentro de cada
 * uma exigir:
 *
 *   Lei nº 8.666/1993, art. 27: habilitação jurídica; qualificação técnica;
 *   qualificação econômico-financeira; regularidade fiscal e trabalhista;
 *   cumprimento do art. 7º, XXXIII, da Constituição.
 *
 *   Lei nº 14.133/2021, art. 62: habilitação jurídica; técnica; fiscal,
 *   social e trabalhista; econômico-financeira; e, quando cabível, sujeição a
 *   normas de licitação sustentável.
 *
 * As duas leis convivem hoje: municípios e órgãos migraram em datas
 * diferentes, e editais antigos continuam regidos pela lei sob a qual foram
 * publicados. Por isso a categoria é a mesma nas duas — o que muda é a
 * citação legal exata.
 *
 * Isso importa para a leitura automática do edital: em vez de extrair texto
 * livre e tentar adivinhar do que se trata, o leitor classifica cada exigência
 * numa dessas cinco categorias fechadas. Errar a categoria de um item é raro;
 * inventar uma sexta categoria que a lei não prevê não deveria acontecer nunca.
 *
 * A conferência de conteúdo real veio do edital nº 004/2021 (Pregão
 * Presencial, Prefeitura de Icém/SP, aquisição de produtos de limpeza), que
 * segue a Lei nº 8.666/93 e lista exatamente quatro das cinco categorias —
 * este certame não teve exigência de qualificação técnica, o que a própria
 * lei permite: o edital exige só o que o objeto justifica.
 */

export type CategoriaHabilitacao =
  | "JURIDICA"
  | "TECNICA"
  | "ECONOMICO_FINANCEIRA"
  | "FISCAL_TRABALHISTA"
  | "TRABALHO_MENOR";

export const CATEGORIAS_HABILITACAO: Record<
  CategoriaHabilitacao,
  { nome: string; fundamento: string; descricao: string }
> = {
  JURIDICA: {
    nome: "Habilitação jurídica",
    fundamento: "Lei nº 8.666/1993, art. 28, ou Lei nº 14.133/2021, art. 66",
    descricao: "Prova de que a empresa existe legalmente e de quem tem poder para representá-la.",
  },
  TECNICA: {
    nome: "Qualificação técnica",
    fundamento: "Lei nº 8.666/1993, art. 30, ou Lei nº 14.133/2021, art. 67",
    descricao: "Prova de capacidade para executar o objeto — atestados, registro em conselho de classe, corpo técnico.",
  },
  ECONOMICO_FINANCEIRA: {
    nome: "Qualificação econômico-financeira",
    fundamento: "Lei nº 8.666/1993, art. 31, ou Lei nº 14.133/2021, art. 69",
    descricao: "Prova de que a empresa tem capacidade financeira para cumprir o contrato.",
  },
  FISCAL_TRABALHISTA: {
    nome: "Regularidade fiscal e trabalhista",
    fundamento: "Lei nº 8.666/1993, art. 29, ou Lei nº 14.133/2021, art. 68",
    descricao: "Certidões que provam estar em dia com tributos federais, estaduais, municipais, FGTS e débitos trabalhistas.",
  },
  TRABALHO_MENOR: {
    nome: "Cumprimento do art. 7º, XXXIII, da Constituição",
    fundamento: "Constituição Federal, art. 7º, XXXIII; Lei nº 9.854/1999",
    descricao: "Declaração de que não emprega menor de 18 anos em trabalho noturno, perigoso ou insalubre, nem menor de 16 em qualquer trabalho, salvo aprendiz a partir de 14.",
  },
};

/** Um documento concreto que um edital pode exigir dentro de uma categoria. */
export type DocumentoHabilitacao = {
  chave: string;
  categoria: CategoriaHabilitacao;
  nome: string;
  /**
   * Como a plataforma resolve esta exigência hoje.
   *
   * "AUTOMATICO": já existe fonte oficial de consulta ligada (Receita, PGFN,
   * CNDT etc.) e a plataforma confere sozinha.
   * "EMISSAO": a plataforma leva ao órgão certo, mas quem emite decide na
   * hora — normalmente por exigir captcha.
   * "UPLOAD": não existe base pública para isso; depende de documento que a
   * própria empresa apresenta (contrato social, atestado, balanço).
   * "GERADO": a própria plataforma produz o documento, a partir do cadastro
   * (as declarações padronizadas que se repetem em todo edital).
   */
  resolucao: "AUTOMATICO" | "EMISSAO" | "UPLOAD" | "GERADO";
  /** Chave do documento gerado pela plataforma, quando resolucao é GERADO. */
  documentoGerado?: string;
};

/**
 * Catálogo dos documentos de habilitação mais comuns.
 *
 * Não é exaustivo — cada edital pode pedir uma variação. Serve de vocabulário
 * conhecido para a leitura automática: um item do edital que bate com um
 * destes é classificado direto; o que não bate cai como "não reconhecido",
 * para conferência humana, em vez de ser forçado numa categoria errada.
 */
export const DOCUMENTOS_HABILITACAO: DocumentoHabilitacao[] = [
  // ----- jurídica -----
  { chave: "CONTRATO_SOCIAL", categoria: "JURIDICA", nome: "Ato constitutivo, estatuto ou contrato social em vigor", resolucao: "UPLOAD" },
  { chave: "ATA_ELEICAO_ADMINISTRADORES", categoria: "JURIDICA", nome: "Documento de eleição ou designação dos administradores", resolucao: "UPLOAD" },
  { chave: "REGISTRO_EMPRESARIO_INDIVIDUAL", categoria: "JURIDICA", nome: "Registro empresarial na Junta Comercial (empresário individual)", resolucao: "UPLOAD" },

  // ----- técnica -----
  { chave: "ATESTADO_CAPACIDADE_TECNICA", categoria: "TECNICA", nome: "Atestado de capacidade técnica", resolucao: "UPLOAD" },
  { chave: "REGISTRO_CONSELHO_CLASSE", categoria: "TECNICA", nome: "Registro ou inscrição na entidade profissional competente", resolucao: "UPLOAD" },

  // ----- econômico-financeira -----
  { chave: "CERTIDAO_FALENCIA_CONCORDATA", categoria: "ECONOMICO_FINANCEIRA", nome: "Certidão negativa de falência, concordata e recuperação judicial", resolucao: "EMISSAO" },
  { chave: "BALANCO_PATRIMONIAL", categoria: "ECONOMICO_FINANCEIRA", nome: "Balanço patrimonial e demonstrações contábeis do último exercício", resolucao: "UPLOAD" },

  // ----- fiscal e trabalhista -----
  { chave: "CNPJ", categoria: "FISCAL_TRABALHISTA", nome: "Prova de inscrição no CNPJ", resolucao: "AUTOMATICO" },
  { chave: "INSCRICAO_ESTADUAL_MUNICIPAL", categoria: "FISCAL_TRABALHISTA", nome: "Inscrição no cadastro de contribuintes estadual e/ou municipal", resolucao: "UPLOAD" },
  { chave: "CERTIDAO_TRIBUTOS_FEDERAIS", categoria: "FISCAL_TRABALHISTA", nome: "Certidão conjunta de tributos federais e dívida ativa da União", resolucao: "AUTOMATICO" },
  { chave: "CERTIDAO_TRIBUTOS_ESTADUAIS", categoria: "FISCAL_TRABALHISTA", nome: "Certidão de regularidade com a Fazenda Estadual", resolucao: "EMISSAO" },
  { chave: "CERTIDAO_TRIBUTOS_MUNICIPAIS", categoria: "FISCAL_TRABALHISTA", nome: "Certidão de regularidade com a Fazenda Municipal", resolucao: "EMISSAO" },
  { chave: "CERTIDAO_FGTS", categoria: "FISCAL_TRABALHISTA", nome: "Certidão de regularidade do FGTS", resolucao: "EMISSAO" },
  { chave: "CNDT", categoria: "FISCAL_TRABALHISTA", nome: "Certidão Negativa de Débitos Trabalhistas (CNDT)", resolucao: "AUTOMATICO" },

  // ----- art. 7º, XXXIII, CF — sempre resolvida por declaração própria -----
  { chave: "DECLARACAO_NAO_EMPREGA_MENOR", categoria: "TRABALHO_MENOR", nome: "Declaração de que não emprega menor", resolucao: "GERADO", documentoGerado: "LICIT_NAO_EMPREGA_MENOR" },
];

export function documentoHabilitacao(chave: string): DocumentoHabilitacao | undefined {
  return DOCUMENTOS_HABILITACAO.find((d) => d.chave === chave);
}

export function documentosPorCategoria(categoria: CategoriaHabilitacao): DocumentoHabilitacao[] {
  return DOCUMENTOS_HABILITACAO.filter((d) => d.categoria === categoria);
}
