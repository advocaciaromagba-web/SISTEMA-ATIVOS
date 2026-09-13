/**
 * Medição do que as consultas externas pagas consomem, por solução.
 *
 * O contrato com o provedor (Infosimples hoje, bureau de crédito em seguida) é
 * único para a plataforma inteira — uma conta só, uma fatura só. Mas o dinheiro
 * que cada solução gasta precisa ficar separado, pelo mesmo motivo que a
 * cobrança do Asaas fica: sem saber quanto o Compliance consome, não há como
 * saber se a assinatura do Compliance paga o próprio custo.
 *
 * Mesma regra do `UsoIa`: o custo NÃO é estimado. Só é gravado quando o próprio
 * provedor informa o preço na resposta da consulta. Quando ele não informa, o
 * campo fica nulo e a tela diz que falta o dado, em vez de exibir um número
 * inventado.
 */
import { prisma } from "@/lib/prisma";

export type ContextoConsulta = {
  /** Qual solução pediu a consulta — é o que separa o gasto de cada uma. */
  solucao?: string | null;
  /** Conta cliente dentro daquela solução. */
  contaId?: string | null;
  /** O que estava sendo consultado, para dar sentido à linha depois. */
  referencia?: string | null;
};

/** "R$ 0,21" ou "0.21" viram 0.21. Devolve null quando não dá para ler com certeza. */
function precoParaNumero(bruto: string | null | undefined): number | null {
  if (!bruto) return null;
  const limpo = bruto.replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return null;

  // Formato brasileiro ("1.234,56") vira "1234.56"; o americano passa direto.
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

/** Grava a consulta. Nunca derruba a operação principal se falhar. */
export async function registrarUsoConsulta(params: {
  provedor: string;
  servico: string;
  documento?: string | null;
  /** Preço como o provedor devolveu ("0.21", "R$ 0,21"). */
  custoBruto?: string | null;
  moeda?: string | null;
  contexto?: ContextoConsulta;
  erro?: string | null;
}): Promise<void> {
  try {
    await prisma.usoConsulta.create({
      data: {
        solucao: params.contexto?.solucao ?? null,
        contaId: params.contexto?.contaId ?? null,
        referencia: params.contexto?.referencia ?? null,
        provedor: params.provedor,
        servico: params.servico,
        documento: params.documento ? params.documento.replace(/\D/g, "") : null,
        // O custo é gravado mesmo quando a consulta falha: alguns provedores
        // cobram a tentativa (visto na Infosimples, na CND federal, que cobra
        // R$ 0,30 e não emite). Custo que não aparece aqui vira surpresa na
        // fatura.
        custo: precoParaNumero(params.custoBruto),
        moeda: params.moeda ?? (params.custoBruto ? "BRL" : null),
        erro: params.erro ?? null,
      },
    });
  } catch {
    // Medir custo não pode quebrar o que o cliente pediu.
  }
}

export type CustoConsultaDaSolucao = {
  consultas: number;
  custo: number | null;
  semPreco: number;
  falhas: number;
};

/**
 * Consumo de consultas externas por solução num período.
 *
 * `custo` fica `null` quando NENHUMA consulta daquela solução trouxe preço —
 * nunca um zero fingido. Havendo ao menos uma com preço, o valor somado
 * aparece, e `semPreco` diz quantas ficaram de fora da conta.
 */
export async function custoConsultasPorSolucaoDesde(desde: Date): Promise<Record<string, CustoConsultaDaSolucao>> {
  const usos = await prisma.usoConsulta.findMany({
    where: { criadoEm: { gte: desde } },
    select: { solucao: true, custo: true, erro: true },
  });

  const porSolucao: Record<string, CustoConsultaDaSolucao> = {};
  for (const u of usos) {
    const chave = u.solucao ?? "(sem solução informada)";
    const atual = porSolucao[chave] ?? { consultas: 0, custo: null, semPreco: 0, falhas: 0 };

    // Falha entra na contagem de falhas, mas o custo dela soma junto: quando
    // o provedor cobra a tentativa, esse dinheiro saiu de verdade.
    if (u.erro) atual.falhas += 1;
    else atual.consultas += 1;

    if (u.custo === null) {
      if (!u.erro) atual.semPreco += 1;
    } else {
      atual.custo = (atual.custo ?? 0) + Number(u.custo);
    }

    porSolucao[chave] = atual;
  }

  return porSolucao;
}
