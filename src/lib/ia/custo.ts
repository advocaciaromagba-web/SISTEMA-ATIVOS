/**
 * Medição do que a inteligência artificial consome e custa.
 *
 * Regra que vale aqui como no resto do sistema: número não se inventa.
 * - Os TOKENS vêm do campo `usage` da resposta da própria API. São medidos.
 * - O CUSTO só é calculado quando alguém informou o preço do modelo em
 *   `PrecoIa`, com a fonte de onde tirou. Sem preço informado, o custo fica
 *   nulo e a tela diz que falta o preço — em vez de exibir um número bonito
 *   e errado, que é o tipo de coisa que vira decisão de negócio equivocada.
 *
 * Sobre saldo: a API da Anthropic NÃO devolve saldo nem data de renovação
 * com a chave de uso comum. Então o sistema não finge saber. O que ele faz é
 * reconhecer o erro específico de crédito insuficiente quando ele aparece, e
 * transformar isso num alerta — que é o momento em que a informação
 * realmente importa.
 */
import { prisma } from "@/lib/prisma";

export type ContextoUsoIa = {
  solucao?: string | null;
  contaId?: string | null;
  referencia?: string | null;
};

export type UsoMedido = {
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  tokensCacheCriacao: number;
  tokensCacheLeitura: number;
};

/** Formato do campo `usage` devolvido pela API de mensagens. */
type UsageApi = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export function lerUso(dados: { model?: string; usage?: UsageApi } | null, modeloPedido: string): UsoMedido {
  const u = dados?.usage ?? {};
  return {
    modelo: dados?.model ?? modeloPedido,
    tokensEntrada: u.input_tokens ?? 0,
    tokensSaida: u.output_tokens ?? 0,
    tokensCacheCriacao: u.cache_creation_input_tokens ?? 0,
    tokensCacheLeitura: u.cache_read_input_tokens ?? 0,
  };
}

/**
 * Custo em dólar, se houver preço informado para aquele modelo.
 *
 * Tokens de cache entram como tokens de entrada: sem o preço específico de
 * cache informado, contar pelo preço de entrada é a aproximação que ERRA PARA
 * MAIS na leitura de cache (que costuma ser mais barata). Melhor superestimar
 * custo do que subestimar.
 */
export async function calcularCustoUsd(uso: UsoMedido): Promise<number | null> {
  const preco = await prisma.precoIa.findUnique({ where: { modelo: uso.modelo } });
  if (!preco) return null;

  const entrada = uso.tokensEntrada + uso.tokensCacheCriacao + uso.tokensCacheLeitura;
  const custo =
    (entrada / 1_000_000) * Number(preco.usdPorMilhaoEntrada) +
    (uso.tokensSaida / 1_000_000) * Number(preco.usdPorMilhaoSaida);

  return Number(custo.toFixed(6));
}

/** Grava a chamada. Nunca derruba a operação principal se falhar. */
export async function registrarUsoIa(params: {
  uso: UsoMedido;
  contexto?: ContextoUsoIa;
  erro?: string | null;
}): Promise<void> {
  try {
    const custoUsd = params.erro ? null : await calcularCustoUsd(params.uso);

    await prisma.usoIa.create({
      data: {
        solucao: params.contexto?.solucao ?? null,
        contaId: params.contexto?.contaId ?? null,
        referencia: params.contexto?.referencia ?? null,
        modelo: params.uso.modelo,
        tokensEntrada: params.uso.tokensEntrada,
        tokensSaida: params.uso.tokensSaida,
        tokensCacheCriacao: params.uso.tokensCacheCriacao,
        tokensCacheLeitura: params.uso.tokensCacheLeitura,
        custoUsd,
        erro: params.erro ?? null,
      },
    });
  } catch {
    // Medir custo não pode quebrar o que o cliente pediu.
  }
}

// ---------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------

/**
 * Reconhece, no erro devolvido pela API, o caso de crédito acabado.
 *
 * A Anthropic responde HTTP 400 com mensagem contendo "credit balance is too
 * low" quando não há saldo. 401 é chave inválida ou revogada; 429 é limite de
 * uso. Os três param o sistema, e os três merecem alerta — mas com textos
 * diferentes, porque a providência é diferente em cada um.
 */
export function classificarFalhaIa(status: number, corpo: string): { tipo: string; titulo: string; detalhe: string } | null {
  const texto = corpo.toLowerCase();

  if (texto.includes("credit balance is too low") || texto.includes("insufficient credit")) {
    return {
      tipo: "IA_SEM_CREDITO",
      titulo: "Crédito da IA acabou — a leitura de documentos parou",
      detalhe:
        "A Anthropic recusou a chamada por saldo insuficiente. Recarregue o crédito em console.anthropic.com. " +
        "Enquanto isso, a leitura de PDF por IA fica indisponível; o preenchimento manual continua funcionando.",
    };
  }

  if (status === 401 || texto.includes("invalid x-api-key") || texto.includes("authentication_error")) {
    return {
      tipo: "IA_SEM_CREDITO",
      titulo: "Chave da IA recusada — a leitura de documentos parou",
      detalhe:
        "A chave ANTHROPIC_API_KEY foi recusada. Ela pode ter sido revogada ou trocada. " +
        "Gere uma nova em console.anthropic.com e atualize a variável no Railway e no .env.",
    };
  }

  if (status === 429) {
    return {
      tipo: "IA_FALHANDO",
      titulo: "IA recusando chamadas por limite de uso",
      detalhe:
        "A API respondeu 429 (limite atingido). Pode ser pico de uso ou limite da conta. " +
        "Se persistir, confira os limites em console.anthropic.com.",
    };
  }

  return null;
}

/**
 * Abre um alerta, ou soma uma ocorrência ao que já está aberto.
 *
 * Não abre um alerta novo a cada falha: dez avisos iguais na tela viram
 * ruído, e ruído se aprende a ignorar.
 */
export async function abrirAlerta(params: {
  tipo: string;
  gravidade: "CRITICO" | "ATENCAO" | "INFORMATIVO";
  titulo: string;
  detalhe: string;
}): Promise<void> {
  try {
    const aberto = await prisma.alertaSistema.findFirst({
      where: { tipo: params.tipo, resolvido: false },
      orderBy: { criadoEm: "desc" },
    });

    if (aberto) {
      await prisma.alertaSistema.update({
        where: { id: aberto.id },
        data: { ocorrencias: { increment: 1 }, titulo: params.titulo, detalhe: params.detalhe },
      });
      return;
    }

    await prisma.alertaSistema.create({ data: { ...params } });
  } catch {
    // Alerta que falha ao ser gravado não pode derrubar a chamada.
  }
}
