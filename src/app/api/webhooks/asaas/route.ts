import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ativarPlanoPagoDaSolucao, marcarInadimplenteDaSolucao } from "@/app/cliente/painel/acoes";

/**
 * Recebe a confirmação de pagamento do Asaas — é o único jeito de uma
 * assinatura sair de TESTE para ATIVA de verdade. Nada aqui é acionado por
 * clique de cliente, só pela cobrança realmente confirmada do lado de lá.
 *
 * Autenticação: o Asaas manda de volta, em todo webhook, o mesmo token que
 * a gente escolheu ao cadastrar o endpoint (header "asaas-access-token").
 * Sem o token batendo, a chamada não é do Asaas — ignora.
 *
 * Responde 200 rápido e sempre, mesmo em erro de negócio (evento
 * desconhecido, assinatura não encontrada): o Asaas reenvia em cima de
 * qualquer coisa diferente de 200, e reenviar não resolveria esses casos.
 */
const EVENTOS_CONFIRMACAO = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const EVENTOS_ATRASO = new Set(["PAYMENT_OVERDUE"]);

export async function POST(req: NextRequest) {
  const tokenEsperado = (process.env.ASAAS_WEBHOOK_TOKEN ?? "").trim();
  const tokenRecebido = req.headers.get("asaas-access-token") ?? "";
  if (!tokenEsperado || tokenRecebido !== tokenEsperado) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const corpo = await req.json().catch(() => null);
  const evento: string | undefined = corpo?.event;
  const subscriptionId: string | undefined = corpo?.payment?.subscription;

  if (!evento || !subscriptionId) return NextResponse.json({ ok: true });

  const assinatura = await prisma.clienteAssinatura.findUnique({
    where: { asaasSubscriptionId: subscriptionId },
    include: { cliente: true },
  });
  if (!assinatura) return NextResponse.json({ ok: true });

  if (EVENTOS_CONFIRMACAO.has(evento) && assinatura.plano) {
    await ativarPlanoPagoDaSolucao(assinatura.solucao, assinatura.cliente.email, assinatura.plano);
  } else if (EVENTOS_ATRASO.has(evento)) {
    await marcarInadimplenteDaSolucao(assinatura.solucao, assinatura.cliente.email);
  }

  return NextResponse.json({ ok: true });
}
