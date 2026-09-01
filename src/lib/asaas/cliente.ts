/**
 * Asaas — gateway de pagamento que cobra as assinaturas de verdade.
 *
 * CONTRATO DA API:
 *   base sandbox:    https://api-sandbox.asaas.com/v3
 *   base producao:   https://api.asaas.com/v3
 *   autenticacao:    header "access_token: <chave>" (nao e "Authorization: Bearer")
 *
 * O ambiente (sandbox ou producao) vem de ASAAS_AMBIENTE — nunca fica escrito
 * no codigo, para nao arriscar mandar cobranca de teste pra API de producao
 * nem o contrario.
 *
 * Nunca tocamos em numero de cartao: toda cobranca aponta pra um `invoiceUrl`
 * hospedado pelo proprio Asaas, onde quem paga digita os dados la, nao aqui.
 */

function baseUrl(): string {
  const ambiente = (process.env.ASAAS_AMBIENTE ?? "").trim().toLowerCase();
  return ambiente === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

export function asaasConfigurado(): boolean {
  return Boolean((process.env.ASAAS_API_KEY ?? "").trim());
}

function chave(): string {
  const k = (process.env.ASAAS_API_KEY ?? "").trim();
  if (!k) throw new Error("ASAAS_API_KEY não configurada.");
  return k;
}

async function chamar<T>(
  metodo: "GET" | "POST" | "DELETE",
  caminho: string,
  corpo?: Record<string, unknown>
): Promise<{ ok: true; dados: T } | { ok: false; erro: string }> {
  try {
    const resposta = await fetch(`${baseUrl()}${caminho}`, {
      method: metodo,
      headers: { "Content-Type": "application/json", access_token: chave() },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const json = await resposta.json();
    if (!resposta.ok || json?.errors) {
      const msg = Array.isArray(json?.errors) ? json.errors.map((e: any) => e.description).join("; ") : resposta.statusText;
      return { ok: false, erro: msg || `Asaas respondeu ${resposta.status}` };
    }
    return { ok: true, dados: json as T };
  } catch (err: any) {
    return { ok: false, erro: err.message || "Falha ao falar com o Asaas." };
  }
}

// ---------------------------------------------------------------------
// Clientes (quem paga)
// ---------------------------------------------------------------------

export type ClienteAsaas = { id: string; name: string; email?: string; cpfCnpj: string };

export async function criarClienteAsaas(params: {
  nome: string;
  email: string;
  documento: string;
  referenciaExterna: string;
}) {
  return chamar<ClienteAsaas>("POST", "/customers", {
    name: params.nome,
    email: params.email,
    cpfCnpj: params.documento.replace(/\D/g, ""),
    externalReference: params.referenciaExterna,
  });
}

// ---------------------------------------------------------------------
// Assinaturas (cobranca recorrente)
// ---------------------------------------------------------------------

export type FormaPagamento = "PIX" | "CREDIT_CARD";
export type CicloCobranca = "MENSAL" | "ANUAL";

export type AssinaturaAsaas = {
  id: string;
  customer: string;
  value: number;
  nextDueDate: string;
  cycle: string;
  status: string;
};

/** Traduz nosso ciclo pro nome que o Asaas espera. */
function cicloAsaas(ciclo: CicloCobranca): "MONTHLY" | "YEARLY" {
  return ciclo === "ANUAL" ? "YEARLY" : "MONTHLY";
}

export async function criarAssinaturaAsaas(params: {
  asaasCustomerId: string;
  valor: number;
  formaPagamento: FormaPagamento;
  ciclo: CicloCobranca;
  /// Data (YYYY-MM-DD) da primeira cobranca — normalmente o fim do teste
  /// gratis, nunca hoje, pra ninguem ser cobrado antes da hora.
  primeiraCobrancaEm: string;
  descricao: string;
  referenciaExterna: string;
}) {
  return chamar<AssinaturaAsaas>("POST", "/subscriptions", {
    customer: params.asaasCustomerId,
    billingType: params.formaPagamento,
    value: params.valor,
    nextDueDate: params.primeiraCobrancaEm,
    cycle: cicloAsaas(params.ciclo),
    description: params.descricao,
    externalReference: params.referenciaExterna,
  });
}

export async function cancelarAssinaturaAsaas(asaasSubscriptionId: string) {
  return chamar<{ deleted: boolean }>("DELETE", `/subscriptions/${asaasSubscriptionId}`);
}

/** A cobranca (fatura) mais recente gerada pela assinatura — e onde mora o invoiceUrl. */
export type CobrancaAsaas = { id: string; invoiceUrl: string; status: string; dueDate: string };

export async function buscarCobrancasDaAssinatura(asaasSubscriptionId: string) {
  return chamar<{ data: CobrancaAsaas[] }>("GET", `/payments?subscription=${asaasSubscriptionId}&limit=1`);
}
