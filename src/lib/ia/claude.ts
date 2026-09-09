/**
 * Ligação com a inteligência artificial.
 *
 * REGRA QUE VALE PARA TODO USO DE IA NESTE SISTEMA: a IA sugere, a pessoa
 * confirma. Nada que sai daqui vira dado oficial sozinho — vai para a tela
 * marcado como sugestão, e alguém aprova. Número, data e cálculo nunca são
 * pedidos à IA; são conferidos em código.
 */

import { abrirAlerta, classificarFalhaIa, lerUso, registrarUsoIa, type ContextoUsoIa } from "./custo";

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
  /** De quem é este gasto — para a administração conseguir separar depois. */
  contexto?: ContextoUsoIa;
}): Promise<{ ok: true; dados: T } | { ok: false; erro: string }> {
  const chave = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!chave) return { ok: false, erro: "Inteligência artificial não configurada (ANTHROPIC_API_KEY)." };

  const modeloPedido = modelo();

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
        model: modeloPedido,
        max_tokens: params.maxTokens ?? 4000,
        system: params.instrucao,
        messages: [{ role: "user", content: conteudo }],
      }),
      signal: AbortSignal.timeout(TEMPO_LIMITE),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");

      // Falha também é gasto de atenção: fica registrada, e as que param o
      // sistema (crédito acabado, chave revogada, limite) viram alerta.
      const falha = classificarFalhaIa(resposta.status, corpo);
      await registrarUsoIa({
        uso: { modelo: modeloPedido, tokensEntrada: 0, tokensSaida: 0, tokensCacheCriacao: 0, tokensCacheLeitura: 0 },
        contexto: params.contexto,
        erro: `HTTP ${resposta.status}: ${corpo.slice(0, 300)}`,
      });
      if (falha) {
        await abrirAlerta({
          tipo: falha.tipo,
          gravidade: falha.tipo === "IA_SEM_CREDITO" ? "CRITICO" : "ATENCAO",
          titulo: falha.titulo,
          detalhe: falha.detalhe,
        });
      }

      return { ok: false, erro: `IA respondeu HTTP ${resposta.status}: ${corpo.slice(0, 300)}` };
    }

    const dados = (await resposta.json()) as {
      content?: Array<{ type: string; text?: string }>;
      model?: string;
      usage?: Record<string, number>;
      /** "max_tokens" aqui é a própria API confirmando que cortou a resposta no meio — não é suposição. */
      stop_reason?: string;
    };

    // Os tokens vêm da resposta: são medidos, não estimados.
    await registrarUsoIa({ uso: lerUso(dados, modeloPedido), contexto: params.contexto });
    const texto = (dados.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim();

    // A API confirma, pelo stop_reason, se cortou a resposta por falta de
    // espaço — não precisa adivinhar. Verificado contra a API real: com o
    // limite baixo demais, o orçamento de tokens pode ser todo consumido
    // pensando, e o texto sai vazio — não só malformado. Por isso este
    // sinal é conferido antes de decidir "respondeu vazio" ou "formato
    // inesperado", não só no meio do parse.
    const cortada = dados.stop_reason === "max_tokens";

    if (!texto) {
      if (cortada) {
        await abrirAlerta({
          tipo: "IA_RESPOSTA_CORTADA",
          gravidade: "ATENCAO",
          titulo: "IA cortou a resposta antes de escrever qualquer texto",
          detalhe:
            `${params.contexto?.referencia ?? "Chamada sem referência"} (solução ${params.contexto?.solucao ?? "?"}). ` +
            `max_tokens pedido: ${params.maxTokens ?? 4000}. O orçamento de tokens foi consumido antes de gerar texto.`,
        });
        return {
          ok: false,
          erro:
            "Este documento é longo demais para o espaço de resposta configurado — a IA não teve espaço nem para " +
            "começar a responder. Avisamos a equipe para ajustar o limite; por ora, preencha os campos à mão.",
        };
      }
      return { ok: false, erro: "A IA respondeu vazio." };
    }

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

      // Sem isto, o texto que a IA de fato respondeu se perdia — ninguém
      // conseguia saber depois se foi corte, alucinação ou outra coisa.
      await abrirAlerta({
        tipo: cortada ? "IA_RESPOSTA_CORTADA" : "IA_FORMATO_INESPERADO",
        gravidade: "ATENCAO",
        titulo: cortada ? "IA cortou a resposta antes de terminar o JSON" : "IA respondeu fora do formato esperado",
        detalhe:
          `${params.contexto?.referencia ?? "Chamada sem referência"} (solução ${params.contexto?.solucao ?? "?"}). ` +
          `max_tokens pedido: ${params.maxTokens ?? 4000}. Resposta (primeiros 800 caracteres): ${limpo.slice(0, 800)}`,
      });

      return {
        ok: false,
        erro: cortada
          ? "Este documento é longo demais para o espaço de resposta configurado — a leitura foi cortada no meio. " +
            "Avisamos a equipe para ajustar o limite; por ora, preencha os campos à mão."
          : "A IA respondeu num formato que o sistema não conseguiu ler.",
      };
    }
  } catch (erro) {
    return { ok: false, erro: `Falha ao consultar a IA: ${(erro as Error).message}` };
  }
}
