// Vocabulário central do domínio: o que é um processo a distribuir, do
// ponto de vista dos campos que o tribunal exige. Nada de específico de um
// tribunal em particular mora aqui — isso fica em src/conteudo/*.

export type ConfiancaCampo = "alta" | "media" | "baixa" | "vazia";
export type OrigemCampo = "texto-pdf" | "ocr-imagem" | "ia" | "manual";

/** Um valor de campo com rastro de onde veio, para a tela de revisão poder
 * mostrar "achei isso, tem certeza?" em vez de aplicar direto. */
export interface CampoExtraido<T> {
  valor: T;
  confianca: ConfiancaCampo;
  origem: OrigemCampo;
}

export function campoVazio<T>(valorPadrao: T): CampoExtraido<T> {
  return { valor: valorPadrao, confianca: "vazia", origem: "manual" };
}

export type TipoPessoa = "PF" | "PJ";

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export function enderecoVazio(): Endereco {
  return { logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "" };
}

export interface ParteProcesso {
  nome: string;
  tipoPessoa: TipoPessoa;
  documento: string; // CPF ou CNPJ, só números/alfanumérico
  rg: string;
  nacionalidade: string;
  estadoCivil: string;
  profissao: string;
  email: string;
  telefone: string;
  endereco: Endereco;
}

export function parteVazia(): ParteProcesso {
  return {
    nome: "",
    tipoPessoa: "PF",
    documento: "",
    rg: "",
    nacionalidade: "",
    estadoCivil: "",
    profissao: "",
    email: "",
    telefone: "",
    endereco: enderecoVazio(),
  };
}

export interface Advogado {
  nome: string;
  oab: string;
  ufOab: string;
}

export type TipoAnexo =
  | "peticao_inicial"
  | "procuracao"
  | "documento_pessoal"
  | "comprovante_endereco"
  | "prova"
  | "custas"
  | "outro";

export const RÓTULOS_TIPO_ANEXO: Record<TipoAnexo, string> = {
  peticao_inicial: "Petição inicial",
  procuracao: "Procuração",
  documento_pessoal: "Documento pessoal",
  comprovante_endereco: "Comprovante de endereço",
  prova: "Prova/documento comprobatório",
  custas: "Comprovante de custas",
  outro: "Outro",
};

export interface AnexoProcesso {
  arquivo: File;
  nomeOrganizado: string;
  tipo: TipoAnexo;
}

export interface Competencia {
  comarca: string;
  uf: string;
  vara: string;
  distribuicaoAutomatica: boolean;
}

export function competenciaVazia(): Competencia {
  return { comarca: "", uf: "", vara: "", distribuicaoAutomatica: true };
}

/** O checklist obrigatório para distribuição processual. Cada campo de
 * texto/estrutura vem embrulhado em CampoExtraido para carregar a origem e
 * a confiança da extração — as listas (partes, advogados, anexos) não,
 * porque cada item delas já é editado individualmente na revisão. */
export interface ChecklistDistribuicao {
  classeProcessual: CampoExtraido<string>;
  assuntoPrincipal: CampoExtraido<string>;
  assuntosSecundarios: string[];
  competencia: CampoExtraido<Competencia>;
  valorCausa: CampoExtraido<number | null>;
  gratuidadeJustica: boolean;
  segredoJustica: boolean;
  prioridadeTramitacao: boolean;
  poloAtivo: ParteProcesso[];
  poloPassivo: ParteProcesso[];
  advogados: Advogado[];
  anexos: AnexoProcesso[];
  numeroProcessoCnj: CampoExtraido<string>; // se a petição já citar um número (ex.: incidente), fica aqui
}

export function checklistVazio(): ChecklistDistribuicao {
  return {
    classeProcessual: campoVazio(""),
    assuntoPrincipal: campoVazio(""),
    assuntosSecundarios: [],
    competencia: campoVazio(competenciaVazia()),
    valorCausa: campoVazio(null),
    gratuidadeJustica: false,
    segredoJustica: false,
    prioridadeTramitacao: false,
    poloAtivo: [],
    poloPassivo: [],
    advogados: [],
    anexos: [],
    numeroProcessoCnj: campoVazio(""),
  };
}

export type IdTribunal = "pje" | "esaj" | "eproc";

export const NOME_TRIBUNAL: Record<IdTribunal, string> = {
  pje: "PJe",
  esaj: "e-SAJ",
  eproc: "eproc",
};
