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
  "institui[çc][ãa]o\\s+financeira",
  "sociedade\\s+empres[áa]ria",
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

// Palavras que só aparecem no endereçamento ("EXCELENTÍSSIMO ... JUIZ DE
// DIREITO DA VARA CÍVEL DA COMARCA DE X, ESTADO DE Y") e nunca fazem
// parte do nome de uma parte. Servem de parede: ao ler o nome de trás pra
// frente, a leitura para na última delas. Inclui os estados porque o
// endereçamento quase sempre termina em "ESTADO DE <estado>", e o nome da
// parte vem logo depois.
const PALAVRAS_DE_CABECALHO = [
  "excelent[íi]ssim[oa]",
  "senhor[a]?",
  "doutor[a]?",
  "ju[íi]z[ao]?",
  "ju[íi]zo",
  "meirit[íi]ssim[oa]",
  "direito",
  "trabalho",
  "vara",
  "comarca",
  "foro",
  "subse[çc][ãa]o",
  "se[çc][ãa]o",
  "judici[áa]ria",
  "tribunal",
  "estado",
  "c[íi]vel",
  "criminal",
  "federal",
  "justi[çc]a",
  "turma",
  "c[âa]mara",
  "fam[íi]lia",
  "regional",
  "distrital",
  "rio\\s+grande\\s+do\\s+norte",
  "rio\\s+grande\\s+do\\s+sul",
  "mato\\s+grosso\\s+do\\s+sul",
  "mato\\s+grosso",
  "minas\\s+gerais",
  "esp[íi]rito\\s+santo",
  "rio\\s+de\\s+janeiro",
  "s[ãa]o\\s+paulo",
  "santa\\s+catarina",
  "distrito\\s+federal",
  "pernambuco",
  "tocantins",
  "rond[ôo]nia",
  "maranh[ãa]o",
  "para[íi]ba",
  "paran[áa]",
  "amazonas",
  "roraima",
  "sergipe",
  "alagoas",
  "cear[áa]",
  "amap[áa]",
  "bahia",
  "goi[áa]s",
  "piau[íi]",
  "acre",
  "par[áa]",
];

const REGEX_CABECALHO = new RegExp(`\\b(?:${PALAVRAS_DE_CABECALHO.join("|")})\\b`, "gi");

// Nome próprio: palavras que começam com maiúscula, com conectores em
// minúscula no meio ("de", "da", "dos", "e"). SEM a flag "i" de propósito
// — é a maiúscula que distingue "JOSÉ ARINALDO DE OLIVEIRA" de um pedaço
// de frase comum como "inscrito no CPF sob o nº".
const REGEX_NOME_NO_FIM = /(?:[A-ZÀ-Ú][A-ZÀ-Úa-zà-ú'.-]*)(?:\s+(?:d[aeo]s?|e|[A-ZÀ-Ú][A-ZÀ-Úa-zà-ú'.-]*))*$/;

function nomeAntesDaProva(anterior: string): string {
  // Corta tudo até a última palavra de cabeçalho — o nome da parte vem
  // depois dela.
  REGEX_CABECALHO.lastIndex = 0;
  let corte = 0;
  let ocorrencia: RegExpExecArray | null;
  while ((ocorrencia = REGEX_CABECALHO.exec(anterior)) !== null) {
    corte = ocorrencia.index + ocorrencia[0].length;
  }
  let trecho = anterior.slice(corte);
  // Depois de "COMARCA"/"VARA"/"FORO" sobra o "de <lugar>" — que também
  // não é nome de parte.
  if (corte > 0) trecho = trecho.replace(/^\s*d[aeo]s?\s+[A-ZÀ-Ú][A-ZÀ-Úa-zà-ú'.-]*/, "");

  const achado = REGEX_NOME_NO_FIM.exec(trecho.trimEnd());
  return achado ? normalizarEspacos(achado[0]) : "";
}

/** Muita petição não põe rótulo nenhum antes do nome: emenda o nome direto
 * depois do endereçamento ("...COMARCA DE X, ESTADO DE Y FULANO DE TAL,
 * brasileiro, ... CPF ...") e só atribui o papel bem depois ("doravante
 * denominados simplesmente AUTORES"). Aqui a âncora é a prova de
 * qualificação (", brasileiro", ", inscrito no CPF"...) e o nome é lido de
 * trás pra frente a partir dela. Serve de reserva para quando a busca por
 * rótulo não achar nada. */
function extrairNomesSemRotulo(texto: string): string[] {
  const nomes: string[] = [];
  const regexProva = new RegExp(`,\\s*(?:${PROVAS_DE_QUALIFICACAO.join("|")})`, "gi");
  let correspondencia: RegExpExecArray | null;
  while ((correspondencia = regexProva.exec(texto)) !== null) {
    const nome = nomeAntesDaProva(texto.slice(0, correspondencia.index));
    if (nome.length >= 5 && nome.includes(" ")) nomes.push(nome);
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

  // "em face de" marca a virada do polo ativo para o passivo na petição
  // ("... propor a presente AÇÃO X em face de FULANO, ..."). Serve tanto
  // de rótulo do réu quanto de fronteira: o que vem antes disso é
  // qualificação de quem propõe.
  const indiceEmFaceDe = zona.search(/\bem\s+face\s+d[eo]\b/i);
  const zonaDoAutor = indiceEmFaceDe === -1 ? zona : zona.slice(0, indiceEmFaceDe);

  // Formas no singular e no plural (a petição pode escrever "OS
  // REQUERENTES" ou "O REQUERENTE"), e os termos próprios de mandado de
  // segurança/ação mandamental (impetrante/impetrado/autoridade coatora),
  // bem comuns e diferentes de "requerente/requerido".
  const nomesRequerentePorRotulo = extrairNomesPorRotulo(zona, [
    "requerentes?",
    "autor(?:a|as|es)?",
    "exequentes?",
    "reclamantes?",
    "impetrantes?",
  ]);

  return {
    cpfs: extrairCpfs(zona),
    cnpjs: extrairCnpjs(zona),
    ceps: extrairCeps(texto),
    oabs: extrairOabs(texto),
    numeroProcessoCnj: extrairNumeroProcessoCnj(texto),
    valorCausa: extrairValorCausa(texto),
    competencia: extrairCompetencia(texto),
    // Sem rótulo antes do nome (padrão comum: o papel só é atribuído
    // depois, com "doravante denominados simplesmente AUTORES"), cai na
    // busca por posição, limitada ao trecho anterior ao "em face de" para
    // não confundir o autor com o réu.
    nomesRequerente:
      nomesRequerentePorRotulo.length > 0 ? nomesRequerentePorRotulo : extrairNomesSemRotulo(zonaDoAutor),
    nomesRequerido: extrairNomesPorRotulo(zona, [
      "requerid[oa]s?",
      "r[eé]us?",
      "executados?",
      "reclamados?",
      "impetrados?",
      "autoridade\\s+coatora",
      "em\\s+face\\s+d[eo]",
    ]),
  };
}
