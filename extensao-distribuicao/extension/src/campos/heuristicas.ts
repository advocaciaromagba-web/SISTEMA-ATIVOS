// Extração por regras a partir do texto bruto da petição inicial. É
// deliberadamente "melhor esforço": toda petição é redigida com liberdade
// de estilo, então nenhum regex aqui deve ser tratado como fonte de
// verdade — cada achado carrega confiança "baixa" ou "media" e a tela de
// revisão sempre deixa o advogado corrigir antes de qualquer coisa seguir
// para o tribunal.
import type { CampoExtraido, Competencia } from "../tipos";
import { validarCep, validarCnpj, validarCpf, validarNumeroProcessoCnj } from "../validadores";

export interface CandidatosExtraidos {
  cpfs: string[];
  cnpjs: string[];
  ceps: string[];
  oabs: { numero: string; uf: string }[];
  numeroProcessoCnj: CampoExtraido<string> | null;
  valorCausa: CampoExtraido<number | null> | null;
  competencia: CampoExtraido<Competencia> | null;
  nomesRequerente: string[];
  nomesRequerido: string[];
}

function normalizarEspacos(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

function dedupe(valores: string[]): string[] {
  return Array.from(new Set(valores));
}

function extrairCpfs(texto: string): string[] {
  const candidatos = texto.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g) ?? [];
  return dedupe(candidatos.filter((cpf) => validarCpf(cpf)));
}

function extrairCnpjs(texto: string): string[] {
  const candidatos = texto.match(/\b[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-\d{2}\b/g) ?? [];
  return dedupe(candidatos.filter((cnpj) => validarCnpj(cnpj)));
}

function extrairCeps(texto: string): string[] {
  const candidatos = texto.match(/\b\d{5}-\d{3}\b/g) ?? [];
  return dedupe(candidatos.filter((cep) => validarCep(cep)));
}

function extrairOabs(texto: string): { numero: string; uf: string }[] {
  const resultado: { numero: string; uf: string }[] = [];
  const regex = /OAB[\s./]*[:\-]?\s*(?:n[ºo°.]?\s*)?(\d{1,3}(?:\.\d{3})?)\s*[\/\-]\s*([A-Z]{2})\b/gi;
  let correspondencia: RegExpExecArray | null;
  while ((correspondencia = regex.exec(texto)) !== null) {
    resultado.push({ numero: (correspondencia[1] ?? "").replace(/\./g, ""), uf: (correspondencia[2] ?? "").toUpperCase() });
  }
  return resultado;
}

function extrairNumeroProcessoCnj(texto: string): CampoExtraido<string> | null {
  const candidatos = texto.match(/\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/g) ?? [];
  for (const candidato of candidatos) {
    if (validarNumeroProcessoCnj(candidato)) {
      return { valor: candidato.replace(/\D/g, ""), confianca: "alta", origem: "texto-pdf" };
    }
  }
  return null;
}

function extrairValorCausa(texto: string): CampoExtraido<number | null> | null {
  const regex = /valor\s+d[ae]\s+causa[^\d]{0,60}R\$\s*([\d.,]+)/i;
  const correspondencia = regex.exec(texto);
  if (!correspondencia) return null;
  const bruto = (correspondencia[1] ?? "").trim();
  // formato brasileiro: ponto separa milhar, vírgula separa decimal
  const numero = Number(bruto.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return { valor: numero, confianca: "media", origem: "texto-pdf" };
}

function extrairCompetencia(texto: string): CampoExtraido<Competencia> | null {
  const regexComarca = /comarca\s+de\s+([A-ZÀ-Ú][A-Za-zÀ-ú\s]{1,60}?)(?:[,./]|\s{2}|\s+estado|\s+-\s+|$)/i;
  const regexVara = /(\d+ª?\s*vara[^,.\n]{0,60})/i;
  const correspondenciaComarca = regexComarca.exec(texto);
  const correspondenciaVara = regexVara.exec(texto);
  if (!correspondenciaComarca && !correspondenciaVara) return null;
  return {
    valor: {
      comarca: normalizarEspacos(correspondenciaComarca?.[1] ?? ""),
      uf: "",
      vara: normalizarEspacos(correspondenciaVara?.[1] ?? ""),
      distribuicaoAutomatica: false,
    },
    confianca: "baixa",
    origem: "texto-pdf",
  };
}

/** Procura o bloco de nome que segue um rótulo de parte (ex.: "REQUERENTE:")
 * até a prova de que é mesmo a qualificação da parte — uma vírgula seguida
 * de CPF/CNPJ/RG/"portador". Essas mesmas palavras (autor, requerente...)
 * também aparecem várias vezes no meio do texto da petição, fora da
 * qualificação (ex.: "os autores relataram os fatos..."), então SEM essa
 * prova por perto, não devolve nada — um campo vazio é revisado; um nome
 * errado, não. */
function extrairNomesPorRotulo(texto: string, rotulos: string[]): string[] {
  const nomes: string[] = [];
  const alternativas = rotulos.join("|");
  const regex = new RegExp(
    `\\b(?:${alternativas})\\b\\s*[:,\\-]?\\s*([A-ZÀ-Ú][^,.\\n]{2,80}?)(?=,\\s*(?:CPF|CNPJ|RG|brasileir|portador))`,
    "gi"
  );
  let correspondencia: RegExpExecArray | null;
  while ((correspondencia = regex.exec(texto)) !== null) {
    const nome = normalizarEspacos(correspondencia[1] ?? "");
    if (nome.length >= 3) nomes.push(nome);
  }
  return dedupe(nomes);
}

export function extrairCandidatos(texto: string): CandidatosExtraidos {
  return {
    cpfs: extrairCpfs(texto),
    cnpjs: extrairCnpjs(texto),
    ceps: extrairCeps(texto),
    oabs: extrairOabs(texto),
    numeroProcessoCnj: extrairNumeroProcessoCnj(texto),
    valorCausa: extrairValorCausa(texto),
    competencia: extrairCompetencia(texto),
    // Formas no singular e no plural (a petição pode escrever "OS
    // REQUERENTES" ou "O REQUERENTE"), e os termos próprios de mandado de
    // segurança/ação mandamental (impetrante/impetrado/autoridade coatora),
    // bem comuns e diferentes de "requerente/requerido".
    nomesRequerente: extrairNomesPorRotulo(texto, ["requerentes?", "autor(?:a|as|es)?", "exequentes?", "reclamantes?", "impetrantes?"]),
    nomesRequerido: extrairNomesPorRotulo(texto, [
      "requerid[oa]s?",
      "r[eé]us?",
      "executados?",
      "reclamados?",
      "impetrados?",
      "autoridade\\s+coatora",
    ]),
  };
}
