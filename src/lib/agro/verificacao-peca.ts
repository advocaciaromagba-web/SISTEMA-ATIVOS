/**
 * Guarda determinística sobre a peça redigida pela IA (`peticao-ia.ts`).
 *
 * A instrução do sistema manda a IA escrever `[CONFIRMAR: ...]` onde faltar
 * um dado essencial, em vez de inventar. Mas nada garantia que ela realmente
 * obedecesse — se ela simplesmente omitisse o marcador (e não inventasse um
 * valor plausível, só deixasse de mencionar o ponto), o texto sairia limpo
 * na aparência sem a peça estar completa. Este módulo não confere o
 * conteúdo jurídico da peça — só um fato objetivo e barato de checar:
 * quando o cadastro tinha um dado essencial faltando, a peça precisa ter
 * marcado ALGUMA pendência. Zero marcador com dado essencial faltando é
 * sinal de omissão silenciosa, não prova de que está tudo certo.
 */

export type AnalisePeca = {
  /** Texto de cada `[CONFIRMAR: ...]` que a IA escreveu na peça. */
  pendenciasMarcadas: string[];
  /** Rótulos dos campos essenciais que estavam nulos no contexto enviado à IA. */
  camposEssenciaisFaltantes: string[];
  /**
   * Faltava dado essencial e a peça não marcou nenhuma pendência — sinal de
   * que a IA pode ter omitido em vez de sinalizar. Não é prova de erro, é
   * alerta para o advogado olhar com atenção redobrada antes de revisar.
   */
  alertaOmissaoPossivel: boolean;
};

const REGEX_CONFIRMAR = /\[CONFIRMAR:\s*([^\]]+)\]/g;

export function extrairPendenciasMarcadas(texto: string): string[] {
  const pendencias: string[] = [];
  for (const m of texto.matchAll(REGEX_CONFIRMAR)) {
    const conteudo = m[1]?.trim();
    if (conteudo) pendencias.push(conteudo);
  }
  return pendencias;
}

/**
 * Campos que, faltando, comprometem qualquer peça (qualificação das
 * partes, foro, advogado e valor da causa) — não é a lista completa de
 * campos que a peça usa, só os que nenhuma peça pode sair sem.
 */
const CAMPOS_ESSENCIAIS: { caminho: string[]; rotulo: string }[] = [
  { caminho: ["parte_autora", "nome"], rotulo: "nome da parte autora" },
  { caminho: ["parte_re", "nome"], rotulo: "nome da parte ré (instituição financeira)" },
  { caminho: ["advogado", "nome"], rotulo: "nome do advogado" },
  { caminho: ["advogado", "oab"], rotulo: "OAB do advogado" },
  { caminho: ["foro", "comarca"], rotulo: "comarca" },
  { caminho: ["foro", "vara"], rotulo: "vara" },
  { caminho: ["valor_da_causa"], rotulo: "valor da causa" },
];

function valorNoCaminho(contexto: Record<string, unknown>, caminho: string[]): unknown {
  let atual: unknown = contexto;
  for (const chave of caminho) {
    if (atual === null || typeof atual !== "object") return undefined;
    atual = (atual as Record<string, unknown>)[chave];
  }
  return atual;
}

function estaVazio(valor: unknown): boolean {
  return valor === null || valor === undefined || (typeof valor === "string" && valor.trim() === "");
}

export function contarCamposEssenciaisFaltantes(contexto: Record<string, unknown>): string[] {
  return CAMPOS_ESSENCIAIS.filter((c) => estaVazio(valorNoCaminho(contexto, c.caminho))).map((c) => c.rotulo);
}

export function analisarPeca(texto: string, contexto: Record<string, unknown>): AnalisePeca {
  const pendenciasMarcadas = extrairPendenciasMarcadas(texto);
  const camposEssenciaisFaltantes = contarCamposEssenciaisFaltantes(contexto);
  return {
    pendenciasMarcadas,
    camposEssenciaisFaltantes,
    alertaOmissaoPossivel: camposEssenciaisFaltantes.length > 0 && pendenciasMarcadas.length === 0,
  };
}
