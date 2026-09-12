/**
 * Ligação com a inteligência artificial.
 *
 * REGRA QUE VALE PARA TODO USO DE IA NESTE SISTEMA: a IA sugere, a pessoa
 * confirma. Nada que sai daqui vira dado oficial sozinho — vai para a tela
 * marcado como sugestão, e alguém aprova. Número, data e cálculo nunca são
 * pedidos à IA; são conferidos em código.
 *
 * PROVEDOR: o sistema fala com duas IAs possíveis — Anthropic (padrão) ou
 * OpenAI — escolhida pela variável `IA_PROVEDOR` ("anthropic" ou "openai").
 * `perguntarJson`/`perguntarTexto` são o mesmo contrato para quem chama,
 * qualquer que seja o provedor ativo — nenhum dos módulos que já usa este
 * arquivo (leitura de contrato, anexos, petição por IA) precisa saber qual
 * IA está por trás.
 */

import {
  abrirAlerta,
  classificarFalhaIa,
  classificarFalhaIaOpenAI,
  lerUso,
  registrarUsoIa,
  type ContextoUsoIa,
} from "./custo";

const URL_ANTHROPIC = "https://api.anthropic.com/v1/messages";
const URL_OPENAI = "https://api.openai.com/v1/responses";
const TEMPO_LIMITE = 90_000;

function provedorAtivo(): "anthropic" | "openai" {
  return (process.env.IA_PROVEDOR ?? "").trim().toLowerCase() === "openai" ? "openai" : "anthropic";
}

export function iaConfigurada(): boolean {
  return provedorAtivo() === "openai"
    ? Boolean((process.env.OPENAI_API_KEY ?? "").trim())
    : Boolean((process.env.ANTHROPIC_API_KEY ?? "").trim());
}

function modelo(): string {
  return (process.env.ANTHROPIC_MODEL ?? "").trim() || "claude-opus-5";
}

function modeloOpenAI(): string {
  return (process.env.OPENAI_MODEL ?? "").trim() || "gpt-4o";
}

/**
 * Modelo mais forte da OpenAI, para tarefas que não toleram um modelo
 * "mini" — visto ao vivo: pedida para redigir a petição inteira, a gpt-4o-mini
 * devolveu uma peça 5x mais curta que a do Claude Opus 5 para o mesmo
 * contrato, e ignorou por completo os achados de abusividade já apurados
 * (venda casada, multa acima do limite, comissão de permanência cumulada)
 * — o motivo de a peça existir. Nada disso aparece na leitura de contrato
 * (extração de campo já definido, tarefa mais mecânica), então só a redação
 * livre pede este nível.
 */
function modeloOpenAIAvancado(): string {
  return (process.env.OPENAI_MODEL_AVANCADO ?? "").trim() || "gpt-4o";
}

export type BlocoConteudo =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

type ParametrosPergunta = {
  instrucao: string;
  conteudo: string | BlocoConteudo[];
  maxTokens?: number;
  /** De quem é este gasto — para a administração conseguir separar depois. */
  contexto?: ContextoUsoIa;
  /**
   * A leitura de um documento (poucos milhares de tokens de saída) cabe no
   * padrão de 90s. Uma peça inteira redigida livremente, com `maxTokens` na
   * casa de 12000, pode legitimamente passar disso — visto ao vivo: uma
   * petição real levou 91s e estourou o padrão por pouco, sem nenhum alerta
   * (porque "IA respondeu com erro" e "IA excedeu o tempo" caem no mesmo
   * `catch`, e só o segundo é esperado aqui). Quem pede algo mais longo pede
   * também mais tempo.
   */
  tempoLimiteMs?: number;
  /**
   * "avancado" pede o modelo mais forte do provedor ativo, para tarefas de
   * redação livre/síntese que um modelo "mini" entrega incompleto — ver
   * `modeloOpenAIAvancado`. Não faz diferença para a Anthropic hoje (só há
   * um modelo configurado); existe para a OpenAI, onde o padrão de custo
   * baixo (gpt-4o-mini) é bom para extração de campo, mas não para redigir
   * uma peça inteira. Padrão: "padrao".
   */
  nivel?: "padrao" | "avancado";
};

/**
 * O que há de comum entre pedir JSON e pedir texto livre: a chamada HTTP, a
 * medição de custo, e o tratamento de erro — inclusive a resposta cortada
 * por falta de espaço, que a API confirma pelo `stop_reason` (não é
 * suposição). Quem chama decide o que fazer com o texto bruto devolvido.
 */
async function chamarAnthropic(
  params: ParametrosPergunta
): Promise<{ ok: true; texto: string; cortada: boolean } | { ok: false; erro: string }> {
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
      signal: AbortSignal.timeout(params.tempoLimiteMs ?? TEMPO_LIMITE),
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
            "começar a responder. Avisamos a equipe para ajustar o limite.",
        };
      }
      return { ok: false, erro: "A IA respondeu vazio." };
    }

    return { ok: true, texto, cortada };
  } catch (erro) {
    return { ok: false, erro: `Falha ao consultar a IA: ${(erro as Error).message}` };
  }
}

/** Converte o bloco de conteúdo (formato Anthropic, já usado por todo chamador deste arquivo) para o formato de content parts da Responses API da OpenAI. */
function blocoParaOpenAI(bloco: BlocoConteudo): Record<string, unknown> {
  if (bloco.type === "text") return { type: "input_text", text: bloco.text };
  if (bloco.type === "document") {
    return { type: "input_file", filename: "documento.pdf", file_data: `data:application/pdf;base64,${bloco.source.data}` };
  }
  return { type: "input_image", image_url: `data:${bloco.source.media_type};base64,${bloco.source.data}` };
}

/**
 * Mesmo contrato de `chamarAnthropic`, para a Responses API da OpenAI
 * (`/v1/responses` — não a Chat Completions, mais antiga). Formato de
 * requisição e resposta conferidos na documentação oficial em 10/09/2026:
 * conteúdo de arquivo por `input_file`/`file_data` (base64 com prefixo
 * `data:`), imagem por `input_image`/`image_url`, texto de saída dentro de
 * `output[]` nos itens `type: "message"` (nunca só em `output[0]` — a API
 * pode intercalar itens de raciocínio antes da mensagem), e corte de
 * resposta sinalizado por `status: "incomplete"` com
 * `incomplete_details.reason === "max_output_tokens"` — mesmo cuidado já
 * tomado para a Anthropic (`stop_reason`), porque o mesmo tipo de bug (IA
 * cortada sem aviso) já apareceu uma vez neste sistema.
 */
async function chamarOpenAI(
  params: ParametrosPergunta
): Promise<{ ok: true; texto: string; cortada: boolean } | { ok: false; erro: string }> {
  const chave = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!chave) return { ok: false, erro: "Inteligência artificial não configurada (OPENAI_API_KEY)." };

  const modeloPedido = params.nivel === "avancado" ? modeloOpenAIAvancado() : modeloOpenAI();

  const conteudo: BlocoConteudo[] =
    typeof params.conteudo === "string" ? [{ type: "text", text: params.conteudo }] : params.conteudo;

  try {
    const resposta = await fetch(URL_OPENAI, {
      method: "POST",
      headers: {
        authorization: `Bearer ${chave}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modeloPedido,
        max_output_tokens: params.maxTokens ?? 4000,
        input: [
          { role: "system", content: params.instrucao },
          { role: "user", content: conteudo.map(blocoParaOpenAI) },
        ],
      }),
      signal: AbortSignal.timeout(params.tempoLimiteMs ?? TEMPO_LIMITE),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");

      const falha = classificarFalhaIaOpenAI(resposta.status, corpo);
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
      model?: string;
      status?: string;
      incomplete_details?: { reason?: string };
      usage?: Record<string, unknown>;
      output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
    };

    await registrarUsoIa({ uso: lerUso(dados, modeloPedido), contexto: params.contexto });

    const texto = (dados.output ?? [])
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content ?? [])
      .filter((parte) => parte.type === "output_text")
      .map((parte) => parte.text ?? "")
      .join("\n")
      .trim();

    const cortada = dados.status === "incomplete" && dados.incomplete_details?.reason === "max_output_tokens";

    if (!texto) {
      if (cortada) {
        await abrirAlerta({
          tipo: "IA_RESPOSTA_CORTADA",
          gravidade: "ATENCAO",
          titulo: "IA cortou a resposta antes de escrever qualquer texto",
          detalhe:
            `${params.contexto?.referencia ?? "Chamada sem referência"} (solução ${params.contexto?.solucao ?? "?"}). ` +
            `max_output_tokens pedido: ${params.maxTokens ?? 4000}. O orçamento de tokens foi consumido antes de gerar texto.`,
        });
        return {
          ok: false,
          erro:
            "Este documento é longo demais para o espaço de resposta configurado — a IA não teve espaço nem para " +
            "começar a responder. Avisamos a equipe para ajustar o limite.",
        };
      }
      return { ok: false, erro: "A IA respondeu vazio." };
    }

    return { ok: true, texto, cortada };
  } catch (erro) {
    return { ok: false, erro: `Falha ao consultar a IA: ${(erro as Error).message}` };
  }
}

/** Encaminha para o provedor ativo — ver `IA_PROVEDOR` no cabeçalho do arquivo. */
async function chamarIA(
  params: ParametrosPergunta
): Promise<{ ok: true; texto: string; cortada: boolean } | { ok: false; erro: string }> {
  return provedorAtivo() === "openai" ? chamarOpenAI(params) : chamarAnthropic(params);
}

/**
 * Pede uma resposta em JSON, com formato fixo.
 *
 * O `esquema` é descrito no prompt e conferido na volta: modelo de linguagem
 * erra formato, e um JSON quebrado não pode derrubar a auditoria.
 */
export async function perguntarJson<T>(params: ParametrosPergunta): Promise<{ ok: true; dados: T } | { ok: false; erro: string }> {
  const resultado = await chamarIA(params);
  if (!resultado.ok) return resultado;
  const { texto, cortada } = resultado;

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
}

/**
 * Pede uma resposta em texto livre — para quando o que se quer da IA é
 * prosa (uma minuta, um resumo), não um dado estruturado. Mesma medição de
 * custo e mesmo tratamento de corte de resposta do `perguntarJson`, sem a
 * tentativa de interpretar como JSON.
 */
export async function perguntarTexto(params: ParametrosPergunta): Promise<{ ok: true; texto: string } | { ok: false; erro: string }> {
  const resultado = await chamarIA(params);
  if (!resultado.ok) return resultado;
  return { ok: true, texto: resultado.texto };
}
