import { NextRequest, NextResponse } from "next/server";
import { modelo } from "@/lib/modelo-prisma";
import { CONTA_DA_SOLUCAO } from "@/lib/assinatura-solucao";

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
 *
 * A BUSCA MUDOU: a assinatura agora mora na conta da própria solução, e não
 * mais numa tabela do hub. Como o identificador do Asaas é único, basta
 * procurar em qual conta ele está — uma consulta por solução, na tabela
 * daquela solução, do mesmo jeito que o resto do sistema faz.
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

  if (!evento || !subscriptionId) return NextResponse.json({ ok: true });

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
