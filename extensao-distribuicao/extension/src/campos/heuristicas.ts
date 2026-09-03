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

// A extração de texto do PDF às vezes deixa um espaço em volta do ponto ou
// do hífen de um número (ex.: "461.809.008 - 17" em vez de
// "461.809.008-17") — efeito colateral de como a fonte/layout original
// espaça esses caracteres. Todo regex de número de documento abaixo
// tolera esse espaço opcional em cada separador, e a validação por dígito
// verificador (validarCpf/validarCnpj/validarCep) já ignora espaço mesmo,
// então aceitar a variação aqui não abre brecha para lixo passar.
function semEspacosInternos(valor: string): string {
  return valor.replace(/\s+/g, "");
}

function extrairCpfs(texto: string): string[] {
  const candidatos = (texto.match(/\b\d{3}\s*\.\s*\d{3}\s*\.\s*\d{3}\s*-\s*\d{2}\b/g) ?? []).map(semEspacosInternos);
  return dedupe(candidatos.filter((cpf) => validarCpf(cpf)));
}

function extrairCnpjs(texto: string): string[] {
  const candidatos = (
    texto.match(/\b[0-9A-Z]{2}\s*\.\s*[0-9A-Z]{3}\s*\.\s*[0-9A-Z]{3}\s*\/\s*[0-9A-Z]{4}\s*-\s*\d{2}\b/g) ?? []
  ).map(semEspacosInternos);
  return dedupe(candidatos.filter((cnpj) => validarCnpj(cnpj)));
}

function extrairCeps(texto: string): string[] {
  const candidatos = (texto.match(/\b\d{5}\s*-\s*\d{3}\b/g) ?? []).map(semEspacosInternos);
  return dedupe(candidatos.filter((cep) => validarCep(cep)));
}

function extrairOabs(texto: string): { numero: string; uf: string }[] {
  const resultado: { numero: string; uf: string }[] = [];
  const vistos = new Set<string>();
  const adicionar = (numero: string, uf: string): void => {
    const chave = `${numero}/${uf}`;
    if (vistos.has(chave)) return;
    vistos.add(chave);
    resultado.push({ numero, uf });
  };

  // Formato mais comum: "OAB/SP 278.877" (UF logo depois de OAB, número
  // depois da UF).
  const regexUfPrimeiro = /OAB[\s./]*([A-Z]{2})\s*[:\-]?\s*(?:n[ºo°.]?\s*)?(\d{1,3}(?:\s*\.\s*\d{3})?)/gi;
  let correspondencia: RegExpExecArray | null;
  while ((correspondencia = regexUfPrimeiro.exec(texto)) !== null) {
    adicionar(semEspacosInternos(correspondencia[2] ?? "").replace(/\./g, ""), (correspondencia[1] ?? "").toUpperCase());
  }

  // Também aparece na ordem contrária: "OAB 278.877/SP".
  const regexNumeroPrimeiro = /OAB[\s./]*[:\-]?\s*(?:n[ºo°.]?\s*)?(\d{1,3}(?:\s*\.\s*\d{3})?)\s*[\/\-]\s*([A-Z]{2})\b/gi;
  while ((correspondencia = regexNumeroPrimeiro.exec(texto)) !== null) {
    adicionar(semEspacosInternos(correspondencia[1] ?? "").replace(/\./g, ""), (correspondencia[2] ?? "").toUpperCase());
  }

  return resultado;
}

function extrairNumeroProcessoCnj(texto: string): CampoExtraido<string> | null {
  const candidatos = (
    texto.match(/\b\d{7}\s*-?\s*\d{2}\s*\.?\s*\d{4}\s*\.?\s*\d\s*\.?\s*\d{2}\s*\.?\s*\d{4}\b/g) ?? []
  ).map(semEspacosInternos);
  for (const candidato of candidatos) {
    if (validarNumeroProcessoCnj(candidato)) {
      return { valor: candidato.replace(/\D/g, ""), confianca: "alta", origem: "texto-pdf" };
    }
  }
  return null;
}

/** "Valor da causa" nem sempre vem nessa ordem — muita petição escreve
 * "Dá-se à causa... o valor de R$ X" (causa ANTES de valor). Em vez de
 * fixar uma frase, procura todo "R$ número" do texto e aceita o primeiro
 * que tiver a palavra "causa" a até 150 caracteres antes dele — funciona
 * nas duas ordens sem precisar prever cada jeito de escrever a frase. */
function extrairValorCausa(texto: string): CampoExtraido<number | null> | null {
  const regexValor = /R\$\s*([\d.,]+)/g;
  const JANELA_CONTEXTO = 150;
  let correspondencia: RegExpExecArray | null;
  while ((correspondencia = regexValor.exec(texto)) !== null) {
    const contexto = texto.slice(Math.max(0, correspondencia.index - JANELA_CONTEXTO), correspondencia.index);
    if (!/causa/i.test(contexto)) continue;
    const bruto = (correspondencia[1] ?? "").trim();
    // formato brasileiro: ponto separa milhar, vírgula separa decimal
    const numero = Number(bruto.replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(numero) && numero > 0) {
      return { valor: numero, confianca: "media", origem: "texto-pdf" };
    }
  }
  return null;
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

// O que costuma vir logo depois do nome, na qualificação de uma parte —
// pessoa física ("brasileiro", "inscrito no CPF", "residente e
// domiciliado") ou jurídica ("pessoa jurídica de direito privado/público",
// "inscrita no CNPJ", "com sede/estabelecimento em"). Quanto mais desses
// termos, menos qualificação "foge" da extração por não bater com um
// molde único de frase.
const PROVAS_DE_QUALIFICACAO = [
  "CPF",
  "CNPJ",
  "RG",
  "brasileir",
  "portador",
  "inscrit[oa]",
  "pessoa\\s+jur[ií]dica",
  "pessoa\\s+f[íi]sica",
  "residente",
  "domiciliad[oa]",
  "estabelecimento",
  "com\\s+sede",
];

/** Procura o bloco de nome que segue um rótulo de parte (ex.: "REQUERENTE:")
 * até a prova de que é mesmo a qualificação da parte — uma vírgula seguida
 * de um dos termos de PROVAS_DE_QUALIFICACAO. Essas mesmas palavras (autor,
 * requerente...) também aparecem várias vezes no meio do texto da petição,
 * fora da qualificação (ex.: "os autores relataram os fatos..."), então
 * SEM essa prova por perto, não devolve nada — um campo vazio é revisado;
 * um nome errado, não. */
function extrairNomesPorRotulo(texto: string, rotulos: string[]): string[] {
  const nomes: string[] = [];
  const alternativas = rotulos.join("|");
  const regex = new RegExp(
    // Ponto não é mais um caractere de parada aqui: nome de empresa como
    // "BANCO EXEMPLO S.A." tem ponto no meio, e quem realmente delimita o
    // fim do nome é a vírgula seguida da prova de qualificação — exigida
    // logo abaixo — não qualquer ponto.
    `\\b(?:${alternativas})\\b\\s*[:,\\-]?\\s*([A-ZÀ-Ú][^,\\n]{2,80}?)(?=,\\s*(?:${PROVAS_DE_QUALIFICACAO.join("|")}))`,
    "gi"
  );
  let correspondencia: RegExpExecArray | null;
  while ((correspondencia = regex.exec(texto)) !== null) {
    const nome = normalizarEspacos(correspondencia[1] ?? "");
    if (nome.length >= 3) nomes.push(nome);
  }
  return dedupe(nomes);
}

// Numa petição inicial, autor e requerido só aparecem de forma confiável
// no início do documento — no endereçamento e na qualificação das partes,
// antes de "DOS FATOS". Depois disso, as mesmas palavras voltam o tempo
// todo em frases comuns ("os autores demonstraram...", "cabe ao
// requerido..."), que não são qualificação nenhuma. Então CPF/CNPJ e nome
// das partes são procurados só nessa zona inicial — o resto do documento
// (valor da causa, OAB, CEP, número de processo referido) continua sendo
// procurado no texto inteiro, porque pode aparecer em qualquer parte.
const MARCADORES_FIM_QUALIFICACAO = [
  "dos?\\s+fatos",
  "s[ií]ntese\\s+f[áa]tica",
  "breve\\s+relat[óo]",
  "do\\s+relat[óo]rio",
  "dos\\s+antecedentes",
  "do\\s+direito",
  "da\\s+fundamenta[çc][ãa]o",
];

function zonaDeQualificacao(texto: string): string {
  const LIMITE_SEM_MARCADOR = 6000;
  const regex = new RegExp(`\\b(?:i\\s*[-.]?\\s*)?(?:${MARCADORES_FIM_QUALIFICACAO.join("|")})\\b`, "i");
  const indice = texto.search(regex);
  return indice === -1 ? texto.slice(0, LIMITE_SEM_MARCADOR) : texto.slice(0, indice);
}

export function extrairCandidatos(texto: string): CandidatosExtraidos {
  const zona = zonaDeQualificacao(texto);
  return {
    cpfs: extrairCpfs(zona),
    cnpjs: extrairCnpjs(zona),
    ceps: extrairCeps(texto),
    oabs: extrairOabs(texto),
    numeroProcessoCnj: extrairNumeroProcessoCnj(texto),
    valorCausa: extrairValorCausa(texto),
    competencia: extrairCompetencia(texto),
    // Formas no singular e no plural (a petição pode escrever "OS
    // REQUERENTES" ou "O REQUERENTE"), e os termos próprios de mandado de
    // segurança/ação mandamental (impetrante/impetrado/autoridade coatora),
    // bem comuns e diferentes de "requerente/requerido".
    nomesRequerente: extrairNomesPorRotulo(zona, ["requerentes?", "autor(?:a|as|es)?", "exequentes?", "reclamantes?", "impetrantes?"]),
    nomesRequerido: extrairNomesPorRotulo(zona, [
      "requerid[oa]s?",
      "r[eé]us?",
      "executados?",
      "reclamados?",
      "impetrados?",
      "autoridade\\s+coatora",
    ]),
  };
}
