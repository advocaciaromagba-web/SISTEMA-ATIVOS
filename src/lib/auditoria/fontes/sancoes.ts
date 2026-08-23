/**
 * Listas internacionais de sanções (OFAC — Departamento do Tesouro dos EUA).
 *
 * Importa em operação com componente externo: commodity, câmbio, contraparte
 * estrangeira. Uma parte sancionada inviabiliza o pagamento por qualquer banco
 * que opere em dólar, e o negócio morre depois de assinado.
 *
 * A lista é pública e vem num arquivo único de poucos megabytes. Baixamos uma
 * vez por dia e guardamos na memória do servidor — consultar o arquivo inteiro
 * a cada auditoria seria lento e desnecessário.
 */
import type { ResultadoFonte } from "../tipos";

const URL_SDN = "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.CSV";
const VALIDADE_CACHE = 24 * 60 * 60 * 1000;
const TEMPO_LIMITE = 30000;

type Entrada = { nome: string; tipo: string; programa: string; normalizado: string };

let cache: { entradas: Entrada[]; em: number } | null = null;

/** Tira acentos, pontuação e maiúsculas — nomes chegam grafados de várias formas. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Divide uma linha de CSV respeitando as aspas. */
function separarCsv(linha: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let dentroDeAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      // Aspas dobradas dentro do campo representam uma aspa literal.
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }
    } else if (c === "," && !dentroDeAspas) {
      campos.push(atual.trim());
      atual = "";
    } else {
      atual += c;
    }
  }
  campos.push(atual.trim());
  return campos;
}

async function carregarLista(): Promise<Entrada[]> {
  if (cache && Date.now() - cache.em < VALIDADE_CACHE) return cache.entradas;

  const resposta = await fetch(URL_SDN, { signal: AbortSignal.timeout(TEMPO_LIMITE) });
  if (!resposta.ok) throw new Error(`OFAC respondeu HTTP ${resposta.status}`);

  const texto = await resposta.text();
  const entradas: Entrada[] = [];

  for (const linha of texto.split("\n")) {
    if (!linha.trim()) continue;
    const campos = separarCsv(linha);
    const nome = campos[1];
    // "-0-" é como o arquivo marca campo vazio.
    if (!nome || nome === "-0-") continue;
    entradas.push({
      nome,
      tipo: campos[2] && campos[2] !== "-0-" ? campos[2] : "",
      programa: campos[3] && campos[3] !== "-0-" ? campos[3] : "",
      normalizado: normalizar(nome),
    });
  }

  cache = { entradas, em: Date.now() };
  return entradas;
}

/**
 * Procura o nome na lista.
 *
 * Exige coincidência do nome inteiro ou de todas as palavras relevantes, e
 * ignora nomes curtos demais: uma parte chamada "Silva Comércio" não pode
 * disparar alerta por causa de um "Silva" sancionado na Venezuela.
 */
function procurar(entradas: Entrada[], nome: string): Entrada[] {
  const alvo = normalizar(nome);
  if (alvo.length < 8) return [];

  const ignorar = new Set([
    "LTDA", "SA", "S A", "EIRELI", "ME", "EPP", "COMERCIO", "INDUSTRIA", "SERVICOS",
    "PARTICIPACOES", "EMPREENDIMENTOS", "DE", "DA", "DO", "DOS", "DAS", "E",
    "THE", "AND", "OF", "COMPANY", "CORP", "INC", "LLC", "GROUP",
  ]);

  const palavras = alvo.split(" ").filter((p) => p.length > 2 && !ignorar.has(p));
  if (palavras.length === 0) return [];

  return entradas.filter((e) => {
    if (e.normalizado === alvo) return true;
    // Todas as palavras significativas do nome precisam aparecer na entrada.
    return palavras.length >= 2 && palavras.every((p) => e.normalizado.includes(p));
  });
}

export async function consultarSancoes(nome: string): Promise<ResultadoFonte> {
  try {
    const entradas = await carregarLista();
    const achados = procurar(entradas, nome).slice(0, 10);

    if (achados.length === 0) {
      return {
        fonte: "SANCOES_OFAC",
        status: "CONCLUIDA",
        resumo: "Nenhuma coincidência nas listas internacionais de sanções.",
        resultado: { consultados: entradas.length, achados: 0 },
        apontamentos: [],
      };
    }

    return {
      fonte: "SANCOES_OFAC",
      status: "CONCLUIDA",
      resumo: `${achados.length} coincidência(s) de nome na lista de sanções — precisa de conferência manual.`,
      resultado: { consultados: entradas.length, achados },
      apontamentos: [
        {
          gravidade: "GRAVE",
          eixo: "IDONEIDADE",
          titulo: "Nome coincide com lista internacional de sanções",
          detalhe:
            `Foram encontradas ${achados.length} entrada(s) com nome semelhante: ` +
            `${achados.map((a) => a.nome).slice(0, 3).join("; ")}. ` +
            "A coincidência é por nome e pode ser homonímia — confira a identidade antes de concluir. " +
            "Se for a mesma pessoa, nenhum banco que opere em dólar liquidará a operação.",
          fonte: "OFAC — Tesouro dos EUA",
        },
      ],
    };
  } catch (erro) {
    return {
      fonte: "SANCOES_OFAC",
      status: "ERRO",
      resumo: "Não foi possível consultar as listas de sanções agora.",
      erro: (erro as Error).message,
      apontamentos: [],
    };
  }
}
