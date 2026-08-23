/**
 * Ligação com a inteligência artificial.
 *
 * REGRA QUE VALE PARA TODO USO DE IA NESTE SISTEMA: a IA sugere, a pessoa
 * confirma. Nada que sai daqui vira dado oficial sozinho — vai para a tela
 * marcado como sugestão, e alguém aprova. Número, data e cálculo nunca são
 * pedidos à IA; são conferidos em código.
 */

const URL_ANTHROPIC = "https://api.anthropic.com/v1/messages";
const TEMPO_LIMITE = 90_000;

export function iaConfigurada(): boolean {
  return Boolean((process.env.ANTHROPIC_API_KEY ?? "").trim());
}

function modelo(): string {
  return (process.env.ANTHROPIC_MODEL ?? "").trim() || "claude-opus-5";
}

export type BlocoConteudo =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

/**
 * Pede uma resposta em JSON, com formato fixo.
 *
 * O `esquema` é descrito no prompt e conferido na volta: modelo de linguagem
 * erra formato, e um JSON quebrado não pode derrubar a auditoria.
 */
export async function perguntarJson<T>(params: {
  instrucao: string;
  conteudo: string | BlocoConteudo[];
  maxTokens?: number;
}): Promise<{ ok: true; dados: T } | { ok: false; erro: string }> {
  const chave = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!chave) return { ok: false, erro: "Inteligência artificial não configurada (ANTHROPIC_API_KEY)." };

  const conteudo: BlocoConteudo[] =
    typeof params.conteudo === "string" ? [{ type: "text", text: params.conteudo }] : params.conteudo;

  try {
    const resposta = await fetch(URL_ANTHROPIC, {
      method: "POST",
      headers: {
        "x-api-key": chave,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelo(),
        max_tokens: params.maxTokens ?? 4000,
        system: params.instrucao,
        messages: [{ role: "user", content: conteudo }],
      }),
      signal: AbortSignal.timeout(TEMPO_LIMITE),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      return { ok: false, erro: `IA respondeu HTTP ${resposta.status}: ${corpo.slice(0, 300)}` };
    }

    const dados = (await resposta.json()) as { content?: Array<{ type: string; text?: string }> };
    const texto = (dados.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim();

    if (!texto) return { ok: false, erro: "A IA respondeu vazio." };

    // O modelo às vezes embrulha o JSON em cerca de código; tiramos antes de ler.
    const limpo = texto
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      return { ok: true, dados: JSON.parse(limpo) as T };
    } catch {
      // Última tentativa: pegar o primeiro objeto JSON que aparecer no texto.
      const inicio = limpo.indexOf("{");
      const fim = limpo.lastIndexOf("}");
      if (inicio >= 0 && fim > inicio) {
        try {
          return { ok: true, dados: JSON.parse(limpo.slice(inicio, fim + 1)) as T };
        } catch {
          /* cai no erro abaixo */
        }
      }
      return { ok: false, erro: "A IA respondeu num formato que o sistema não conseguiu ler." };
    }
  } catch (erro) {
    return { ok: false, erro: `Falha ao consultar a IA: ${(erro as Error).message}` };
  }
}
