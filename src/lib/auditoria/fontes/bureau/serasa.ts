/**
 * Adaptador do Serasa Experian.
 *
 * COMO LIGAR, quando o contrato estiver assinado:
 *
 *   1. O Serasa entrega um `client_id` e um `client_secret` no portal de
 *      desenvolvedores, junto com a documentação do produto contratado.
 *   2. Preencha no .env:
 *        BUREAU_PROVEDOR="serasa"
 *        SERASA_CLIENT_ID=...
 *        SERASA_CLIENT_SECRET=...
 *        SERASA_TOKEN_URL=...      (endereço de autenticação do contrato)
 *        SERASA_API_URL_PJ=...     (produto de pessoa jurídica; use {documento})
 *        SERASA_API_URL_PF=...     (produto de pessoa física; use {documento})
 *   3. Rode uma consulta de teste e confira o dossiê. Se algum número não
 *      aparecer, o ajuste é só no mapa de campos ao final deste arquivo — em
 *      lugar nenhum mais.
 *
 * Os endereços não vêm escritos aqui de propósito: o Serasa tem catálogo
 * grande (relatório básico, completo, score, pendências, protestos, ações
 * judiciais, faturamento presumido, limite sugerido, quadro societário) e cada
 * contrato libera um conjunto diferente, com URLs próprias. Fixar endereço no
 * código só garantiria que ele estaria errado.
 *
 * A autenticação é OAuth2 client_credentials, padrão do Serasa: troca-se o par
 * de chaves por um token de curta duração, que é reaproveitado enquanto vale.
 */
import {
  booleanoDe,
  buscar,
  contarDe,
  numeroDe,
  textoDe,
  LEITURA_VAZIA,
  type AdaptadorBureau,
  type LeituraBureau,
} from "./tipos";

const TEMPO_LIMITE = 25000;

// O token dura poucos minutos; guardá-lo evita uma ida a mais por consulta.
let tokenCache: { token: string; expiraEm: number } | null = null;

function config() {
  const ler = (chave: string) => (process.env[chave] ?? "").trim();
  return {
    clientId: ler("SERASA_CLIENT_ID"),
    clientSecret: ler("SERASA_CLIENT_SECRET"),
    tokenUrl: ler("SERASA_TOKEN_URL"),
    urlPJ: ler("SERASA_API_URL_PJ"),
    urlPF: ler("SERASA_API_URL_PF"),
  };
}

async function obterToken(): Promise<string> {
  const c = config();

  if (tokenCache && Date.now() < tokenCache.expiraEm) return tokenCache.token;

  const credenciais = Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64");

  const resposta = await fetch(c.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credenciais}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(TEMPO_LIMITE),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    throw new Error(`autenticação recusada (HTTP ${resposta.status}) ${corpo.slice(0, 200)}`);
  }

  const dados = (await resposta.json()) as { access_token?: string; expires_in?: number };
  if (!dados.access_token) throw new Error("resposta de autenticação sem token");

  // Renova com folga de 60 segundos, para não usar um token que vence no meio.
  const duracao = (dados.expires_in ?? 300) * 1000;
  tokenCache = { token: dados.access_token, expiraEm: Date.now() + duracao - 60_000 };

  return dados.access_token;
}

/**
 * Traduz a resposta do Serasa para a leitura única do sistema.
 *
 * Cada campo aceita vários caminhos possíveis porque o nome muda conforme o
 * produto contratado (relatório básico, completo, score isolado) e a versão da
 * API. É aqui — e só aqui — que se ajusta quando a documentação do contrato
 * chegar em mãos.
 */
export function mapearSerasa(bruto: unknown): LeituraBureau {
  const b = bruto;

  return {
    ...LEITURA_VAZIA,

    // ----- score -----
    score: numeroDe(buscar(b, "score.score", "score.value", "creditScore.score", "scoreSerasa", "score")),
    scoreMaximo: numeroDe(buscar(b, "score.maxScore", "score.rangeMax")) ?? 1000,
    scoreFaixa: textoDe(buscar(b, "score.range", "score.classification", "score.faixa", "score.riskLevel")),

    // ----- restrições financeiras -----
    pendenciasFinanceiras: contarDe(
      buscar(b, "negativeData.pefin.summary.count", "pendencias.quantidade", "pefin.quantidade", "pefin.items")
    ),
    valorPendencias: numeroDe(
      buscar(b, "negativeData.pefin.summary.totalAmount", "pendencias.valorTotal", "pefin.valorTotal")
    ),

    protestos: contarDe(
      buscar(b, "negativeData.protest.summary.count", "protestos.quantidade", "protesto.items", "protests")
    ),
    valorProtestos: numeroDe(
      buscar(b, "negativeData.protest.summary.totalAmount", "protestos.valorTotal", "protesto.valorTotal")
    ),

    chequesSemFundo: contarDe(
      buscar(b, "negativeData.bouncedCheck.summary.count", "chequesSemFundo.quantidade", "ccf.quantidade")
    ),

    dividaAtiva: contarDe(buscar(b, "negativeData.activeDebt.summary.count", "dividaAtiva.quantidade")),
    valorDividaAtiva: numeroDe(
      buscar(b, "negativeData.activeDebt.summary.totalAmount", "dividaAtiva.valorTotal")
    ),

    // ----- situação da empresa -----
    falencia: booleanoDe(
      buscar(b, "negativeData.bankruptcy.hasOccurrence", "falencia", "falencia.possui", "bankruptcy")
    ),
    recuperacaoJudicial: booleanoDe(
      buscar(
        b,
        "negativeData.judicialRecovery.hasOccurrence",
        "recuperacaoJudicial",
        "recuperacaoJudicial.possui",
        "judicialRecovery"
      )
    ),
    situacaoReceita: textoDe(
      buscar(b, "registrationData.status", "situacaoCadastral", "company.registrationStatus")
    ),

    // ----- litígio -----
    acoesJudiciais: contarDe(
      buscar(b, "negativeData.lawsuit.summary.count", "acoesJudiciais.quantidade", "lawsuits")
    ),
    valorAcoesJudiciais: numeroDe(
      buscar(b, "negativeData.lawsuit.summary.totalAmount", "acoesJudiciais.valorTotal")
    ),

    // ----- porte e capacidade -----
    faturamentoPresumido: numeroDe(
      buscar(b, "businessData.presumedRevenue", "faturamentoPresumido", "company.estimatedRevenue")
    ),
    limiteCreditoSugerido: numeroDe(
      buscar(b, "creditLimit.suggestedLimit", "limiteCredito", "limiteCreditoSugerido")
    ),

    // ----- comportamento -----
    consultasUltimos90Dias: contarDe(
      buscar(b, "inquiries.last90Days.count", "consultas.ultimos90Dias", "consultasAnteriores.quantidade")
    ),
    participacoesSocietarias: contarDe(
      buscar(b, "partnerships.count", "participacoesSocietarias", "quadroSocietario.participacoes")
    ),

    posicaoEm: textoDe(buscar(b, "reportDate", "dataConsulta", "posicaoEm")),
  };
}

export const adaptadorSerasa: AdaptadorBureau = {
  nome: "Serasa Experian",

  configurado() {
    const c = config();
    return Boolean(c.clientId && c.clientSecret && c.tokenUrl && (c.urlPJ || c.urlPF));
  },

  async consultar(documento, tipo) {
    const c = config();
    const modelo = tipo === "PJ" ? c.urlPJ : c.urlPF;

    if (!modelo) {
      throw new Error(
        tipo === "PJ"
          ? "produto de pessoa jurídica não configurado (SERASA_API_URL_PJ)"
          : "produto de pessoa física não configurado (SERASA_API_URL_PF)"
      );
    }

    const token = await obterToken();
    const url = modelo.replace("{documento}", documento);

    const resposta = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "X-Document-Id": documento,
      },
      signal: AbortSignal.timeout(TEMPO_LIMITE),
    });

    if (resposta.status === 401) {
      // Token pode ter sido revogado antes da hora; força renovação na próxima.
      tokenCache = null;
      throw new Error("Serasa recusou o token (HTTP 401)");
    }

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      throw new Error(`Serasa respondeu HTTP ${resposta.status} ${corpo.slice(0, 200)}`);
    }

    const bruto = await resposta.json();
    return { leitura: mapearSerasa(bruto), bruto };
  },
};
