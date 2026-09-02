// Proxy mínimo, sem banco de dados e sem estado: existe só para a chave de
// API de IA não precisar viver dentro do código da extensão (o que seria
// visível a qualquer pessoa que instalasse o pacote). Roda localmente, na
// máquina do próprio usuário, e só é chamado quando a extensão liga
// "extração assistida por IA" nas opções.
import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import Anthropic from "@anthropic-ai/sdk";

const PORTA = Number(process.env.PORTA ?? 8787);
// claude-opus-5 é o modelo padrão recomendado; ANTHROPIC_MODEL no .env deixa
// trocar por um mais barato (ex.: claude-sonnet-5) se o custo pesar mais do
// que a qualidade da extração para o seu volume de petições.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
const LIMITE_TAMANHO_BYTES = 15 * 1024 * 1024; // petição inicial cabe folgado nisso

const cliente = new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente

interface PedidoExtracao {
  arquivo: string; // PDF em base64, sem o prefixo "data:", sem quebra de linha
  nomeArquivo?: string;
  campos: string[];
}

function definirCabecalhosCors(req: IncomingMessage, res: ServerResponse): void {
  const origem = req.headers.origin;
  if (origem) res.setHeader("Access-Control-Allow-Origin", origem);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function responderJson(res: ServerResponse, status: number, corpo: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(corpo));
}

async function lerCorpoJson(req: IncomingMessage): Promise<unknown> {
  const partes: Buffer[] = [];
  let tamanho = 0;
  for await (const trecho of req) {
    tamanho += (trecho as Buffer).length;
    if (tamanho > LIMITE_TAMANHO_BYTES) {
      throw new Error("Arquivo maior do que o limite aceito pelo servidor.");
    }
    partes.push(trecho as Buffer);
  }
  const texto = Buffer.concat(partes).toString("utf-8");
  return texto ? JSON.parse(texto) : {};
}

function extrairPrimeiroJson(texto: string): Record<string, unknown> {
  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio === -1 || fim === -1 || fim < inicio) {
    throw new Error("A resposta da IA não veio em JSON.");
  }
  return JSON.parse(texto.slice(inicio, fim + 1)) as Record<string, unknown>;
}

async function chamarIa(pedido: PedidoExtracao): Promise<Record<string, unknown>> {
  const prompt =
    `Leia a petição inicial anexada e devolva SÓ um objeto JSON (sem markdown, sem texto antes ou depois) ` +
    `com os campos a seguir, usando string vazia quando não encontrar: ${pedido.campos.join(", ")}. ` +
    `Não invente valor que não estiver escrito no documento.`;

  const mensagem = await cliente.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pedido.arquivo } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const blocoTexto = mensagem.content.find((bloco) => bloco.type === "text");
  if (!blocoTexto || blocoTexto.type !== "text") {
    throw new Error("A IA não devolveu texto (verifique stop_reason da resposta).");
  }
  return extrairPrimeiroJson(blocoTexto.text);
}

function pedidoValido(valor: unknown): valor is PedidoExtracao {
  if (!valor || typeof valor !== "object") return false;
  const candidato = valor as Partial<PedidoExtracao>;
  return typeof candidato.arquivo === "string" && Array.isArray(candidato.campos);
}

const servidor = createServer((req, res) => {
  definirCabecalhosCors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/extrair") {
    lerCorpoJson(req)
      .then((corpo) => {
        if (!pedidoValido(corpo)) {
          responderJson(res, 400, { erro: "Corpo inválido: esperado { arquivo, campos }." });
          return;
        }
        return chamarIa(corpo).then((campos) => responderJson(res, 200, { campos }));
      })
      .catch((erro: unknown) => {
        if (erro instanceof Anthropic.AuthenticationError) {
          responderJson(res, 502, { erro: "ANTHROPIC_API_KEY inválida ou ausente no .env do servidor." });
          return;
        }
        if (erro instanceof Anthropic.RateLimitError) {
          responderJson(res, 429, { erro: "Limite de uso da API de IA atingido — tente de novo em instantes." });
          return;
        }
        if (erro instanceof Anthropic.APIError) {
          responderJson(res, 502, { erro: `API de IA respondeu ${erro.status}: ${erro.message}` });
          return;
        }
        responderJson(res, 502, { erro: erro instanceof Error ? erro.message : String(erro) });
      });
    return;
  }

  responderJson(res, 404, { erro: "Rota não encontrada. Use POST /extrair." });
});

servidor.listen(PORTA, () => {
  console.log(`Servidor de extração assistida por IA ouvindo em http://localhost:${PORTA}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("Aviso: ANTHROPIC_API_KEY não está definida — as chamadas a /extrair vão falhar até você configurar o .env.");
  }
});
