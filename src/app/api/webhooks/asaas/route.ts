import { NextRequest, NextResponse } from "next/server";
import { modelo } from "@/lib/modelo-prisma";
import { prisma } from "@/lib/prisma";
import { CONTA_DA_SOLUCAO } from "@/lib/assinatura-solucao";
import { aplicarPagamentoPedido } from "@/app/painel/avulsos/acoes";

/**
 * Recebe a confirmação de pagamento do Asaas — é o único jeito de uma
 * assinatura sair de TESTE para ATIVA de verdade, ou de um pedido avulso sair
 * de AGUARDANDO_PAGAMENTO. Nada aqui é acionado por clique de cliente, só
 * pela cobrança realmente confirmada do lado de lá.
 *
 * Dois tipos de cobrança chegam neste mesmo endpoint, e a diferença está em
 * `payment.subscription`: presente, é mensalidade de alguma solução (busca em
 * `CONTA_DA_SOLUCAO`); ausente, é cobrança avulsa de um pedido (busca em
 * `Pedido.asaasCobrancaId`). A conta Asaas é uma só para tudo — o que separa
 * o dinheiro de cada solução é a referência de cada cobrança, nunca a conta.
 *
 * Autenticação: o Asaas manda de volta, em todo webhook, o mesmo token que
 * a gente escolheu ao cadastrar o endpoint (header "asaas-access-token").
 * Sem o token batendo, a chamada não é do Asaas — ignora.
 *
 * Responde 200 rápido e sempre, mesmo em erro de negócio (evento
 * desconhecido, assinatura ou pedido não encontrado): o Asaas reenvia em
 * cima de qualquer coisa diferente de 200, e reenviar não resolveria esses
 * casos.
 */
const EVENTOS_CONFIRMACAO = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const EVENTOS_ATRASO = new Set(["PAYMENT_OVERDUE"]);

type ContaComAssinatura = { solucao: string; modeloConta: string; id: string; plano: string | null };

async function acharContaPelaAssinatura(subscriptionId: string): Promise<ContaComAssinatura | null> {
  for (const [solucao, dest] of Object.entries(CONTA_DA_SOLUCAO)) {
    const linha = await modelo(dest.modelo).findFirst({ where: { asaasSubscriptionId: subscriptionId } });
    if (linha) {
      return {
        solucao,
        modeloConta: dest.modelo,
        id: String(linha.id),
        plano: (linha.plano as string | null) ?? null,
      };
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const tokenEsperado = (process.env.ASAAS_WEBHOOK_TOKEN ?? "").trim();
  const tokenRecebido = req.headers.get("asaas-access-token") ?? "";
  if (!tokenEsperado || tokenRecebido !== tokenEsperado) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const corpo = await req.json().catch(() => null);
  const evento: string | undefined = corpo?.event;
  const subscriptionId: string | undefined = corpo?.payment?.subscription;
  const paymentId: string | undefined = corpo?.payment?.id;
  const billingType: string | undefined = corpo?.payment?.billingType;

  if (!evento || !paymentId) return NextResponse.json({ ok: true });

  // Assinatura recorrente (mensalidade de uma solução).
  if (subscriptionId) {
    const conta = await acharContaPelaAssinatura(subscriptionId);
    if (!conta) return NextResponse.json({ ok: true });

    if (EVENTOS_CONFIRMACAO.has(evento)) {
      // O plano já ficou gravado na conta quando a assinatura foi criada; aqui
      // só se confirma que o pagamento entrou.
      await modelo(conta.modeloConta).update({
        where: { id: conta.id },
        data: { statusAssinatura: "ATIVA" },
      });
    } else if (EVENTOS_ATRASO.has(evento)) {
      await modelo(conta.modeloConta).update({
        where: { id: conta.id },
        data: { statusAssinatura: "INADIMPLENTE" },
      });
    }

    return NextResponse.json({ ok: true });
  }

  // Cobrança avulsa (pedido único — hoje só a Gestão de Ativos vende assim).
  if (EVENTOS_CONFIRMACAO.has(evento)) {
    const pedido = await prisma.pedido.findFirst({ where: { asaasCobrancaId: paymentId } });
    if (pedido) {
      await aplicarPagamentoPedido(pedido.id, mapearFormaPagamento(billingType));
    }
  }

  return NextResponse.json({ ok: true });
}

/** "CREDIT_CARD" no Asaas vira "CARTAO" aqui, para bater com o resto do sistema (formulário de confirmação manual). */
function mapearFormaPagamento(billingType: string | undefined): string | null {
  if (!billingType) return null;
  if (billingType === "CREDIT_CARD") return "CARTAO";
  return billingType;
}
