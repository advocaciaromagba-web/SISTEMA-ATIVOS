/**
 * Vocabulário da auditoria.
 *
 * Duas perguntas guiam tudo aqui, e elas são independentes:
 *   1. A parte é idônea? (existe, está regular, não está punida)
 *   2. A parte tem capacidade de pagamento? (dá conta do valor da operação)
 *
 * Uma empresa pode ser perfeitamente idônea e não ter dinheiro; e pode ter
 * caixa e estar declarada inidônea. Por isso os dois resultados são separados,
 * e nenhum dos dois é reduzido a uma nota só.
 */

export type Gravidade = "GRAVE" | "MEDIA" | "BAIXA" | "INFO";

/** Em qual das perguntas o apontamento pesa. */
export type Eixo = "IDONEIDADE" | "CAPACIDADE" | "CADASTRO";

export type Apontamento = {
  gravidade: Gravidade;
  eixo: Eixo;
  titulo: string;
  /** Explicação em linguagem de quem não é do ramo, dizendo o que fazer. */
  detalhe: string;
  fonte: string;
};

export type Idoneidade = "SEM_APONTAMENTO" | "ATENCAO" | "RESTRICAO";
export type Capacidade = "SUFICIENTE" | "LIMITADA" | "INSUFICIENTE" | "NAO_AVALIADA";

/** Retorno de uma fonte externa. */
export type ResultadoFonte = {
  fonte: string;
  /** CONCLUIDA = respondeu; INDISPONIVEL = sem chave ou sem suporte; ERRO = falhou. */
  status: "CONCLUIDA" | "INDISPONIVEL" | "ERRO";
  /** Uma frase dizendo o que a fonte encontrou. */
  resumo: string;
  /** Resposta bruta, guardada como prova do que foi consultado e quando. */
  resultado?: unknown;
  erro?: string;
  apontamentos: Apontamento[];
};

/** Dados cadastrais normalizados, vindos da Receita. */
export type DadosCadastrais = {
  razaoSocial: string | null;
  nomeFantasia: string | null;
  situacao: string | null;
  motivoSituacao: string | null;
  dataSituacao: string | null;
  dataAbertura: string | null;
  capitalSocial: number | null;
  porte: string | null;
  naturezaJuridica: string | null;
  atividadePrincipal: string | null;
  optanteSimples: boolean | null;
  optanteMei: boolean | null;
  matriz: boolean | null;
  municipio: string | null;
  uf: string | null;
  socios: Array<{ nome: string; documento: string | null; qualificacao: string | null; desde: string | null }>;
};

export type ResultadoAuditoria = {
  idoneidade: Idoneidade;
  capacidade: Capacidade;
  pontuacao: number;
  parecer: string;
  apontamentos: Apontamento[];
  dadosCadastrais: DadosCadastrais | null;
  fontes: ResultadoFonte[];
  fontesIndisponiveis: string[];
  valorReferencia: number | null;
};

export const ROTULO_GRAVIDADE: Record<Gravidade, string> = {
  GRAVE: "Grave",
  MEDIA: "Atenção",
  BAIXA: "Menor",
  INFO: "Informação",
};

export const ROTULO_IDONEIDADE: Record<Idoneidade, string> = {
  SEM_APONTAMENTO: "Sem apontamentos",
  ATENCAO: "Pontos de atenção",
  RESTRICAO: "Com restrição",
};

export const ROTULO_CAPACIDADE: Record<Capacidade, string> = {
  SUFICIENTE: "Compatível com a operação",
  LIMITADA: "Limitada para o valor",
  INSUFICIENTE: "Incompatível com o valor",
  NAO_AVALIADA: "Não avaliada",
};
