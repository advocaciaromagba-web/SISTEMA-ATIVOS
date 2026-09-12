"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirEdicao, exigirSessao } from "@/lib/sessao";
import { registrar } from "@/lib/registro";
import { AVULSO_POR_CHAVE, competenciaAtual, prazoDeEntrega } from "@/lib/avulsos";
import { PLANO_POR_CHAVE } from "@/lib/planos";
import {
  asaasConfigurado,
  criarClienteAsaas,
  criarCobrancaAvulsaAsaas,
  cancelarCobrancaAvulsaAsaas,
  type FormaPagamentoAvulso,
} from "@/lib/asaas/cliente";
import type { ResultadoAcao } from "../pessoas/acoes";

const texto = (d: FormData, chave: string) => (d.get(chave)?.toString() ?? "").trim() || null;

function somenteDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

/** CPF ou CNPJ pelo tamanho. O Asaas confere o resto. */
function documentoValido(v: string): boolean {
  const d = somenteDigitos(v);
  return d.length === 11 || d.length === 14;
}

/** Próximo número do pedido: PD-0001, PD-0002... */
async function proximoNumero(organizacaoId: string): Promise<string> {
  const ultimo = await prisma.pedido.findFirst({
    where: { organizacaoId },
    orderBy: { criadoEm: "desc" },
    select: { numero: true },
  });

  const atual = Number(ultimo?.numero?.replace(/\D/g, "") ?? 0);
  return `PD-${String(atual + 1).padStart(4, "0")}`;
}

/**
 * Cria um pedido avulso e já gera a cobrança de verdade no Asaas.
 *
 * O pedido nasce aguardando pagamento e NÃO executa nada até ser pago. É de
 * propósito: serviço entregue antes de pago vira cobrança difícil, e consulta
 * paga por unidade não pode ser disparada por engano.
 *
 * A cobrança usa a MESMA conta Asaas da assinatura da organização, mas é uma
 * cobrança avulsa (endpoint `/payments`, não `/subscriptions`), com
 * referência própria (`AVULSO:GESTAO_ATIVOS:<pedidoId>`) — assim o Asaas, o
 * webhook e o extrato financeiro sempre sabem que aquele recebimento é de um
 * pedido específico desta solução, nunca da mensalidade nem de outra conta.
 * Se o Asaas não estiver configurado (ambiente local sem chave), o pedido
 * continua sendo criado do jeito antigo, para confirmação manual.
 */
export async function criarPedido(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  const chave = texto(dados, "item");
  if (!chave) return { erro: "Escolha o que deseja comprar." };

  const item = AVULSO_POR_CHAVE[chave];
  if (!item) return { erro: "Item desconhecido." };

  const quantidade = Math.max(1, Number(texto(dados, "quantidade") ?? 1) || 1);
  const pessoaId = texto(dados, "pessoaId");
  const operacaoId = texto(dados, "operacaoId");

  if (item.exigeParte && !pessoaId) {
    return { erro: `${item.nome} precisa apontar a qual parte se refere.` };
  }
  if (item.exigeOperacao && !operacaoId) {
    return { erro: `${item.nome} precisa apontar a qual operação se refere.` };
  }

  // Confere que parte e operação pertencem a quem está pedindo.
  if (pessoaId) {
    const pessoa = await prisma.pessoa.findFirst({ where: { id: pessoaId, organizacaoId: organizacao.id } });
    if (!pessoa) return { erro: "Parte não encontrada." };
  }
  if (operacaoId) {
    const operacao = await prisma.operacao.findFirst({ where: { id: operacaoId, organizacaoId: organizacao.id } });
    if (!operacao) return { erro: "Operação não encontrada." };
  }

  const valorTotal = item.preco * quantidade;

  // Antes de criar o pedido: garante o cliente Asaas da organização, se a
  // cobrança automática estiver ligada. Falhar aqui é melhor que falhar
  // depois de já ter criado o pedido.
  let asaasCustomerId = organizacao.asaasCustomerId;
  let cnpjParaSalvar: string | null = null;

  if (asaasConfigurado() && !asaasCustomerId) {
    let documento = organizacao.cnpj;
    if (!documento) {
      const informado = texto(dados, "documento");
      if (!informado || !documentoValido(informado)) {
        return { erro: "Informe um CPF ou CNPJ válido para gerar a cobrança." };
      }
      documento = somenteDigitos(informado);
    }

    const criado = await criarClienteAsaas({
      nome: organizacao.nome,
      email: organizacao.emailContato || usuario.email,
      documento,
      referenciaExterna: `GESTAO_ATIVOS:${organizacao.id}`,
    });
    if (!criado.ok) return { erro: `Não foi possível cadastrar o pagamento: ${criado.erro}` };

    asaasCustomerId = criado.dados.id;
    cnpjParaSalvar = documento;
  }

  const pedido = await prisma.pedido.create({
    data: {
      organizacaoId: organizacao.id,
      numero: await proximoNumero(organizacao.id),
      item: item.chave,
      descricao: item.nome,
      quantidade,
      valorUnitario: item.preco,
      valorTotal,
      pessoaId,
      operacaoId,
      situacao: "AGUARDANDO_PAGAMENTO",
      prazoUteis: item.prazoUteis,
      prometidoAte: item.prazoUteis > 0 ? prazoDeEntrega(item.prazoUteis) : null,
      observacao: texto(dados, "observacao"),
      solicitadoPorId: usuario.id,
    },
  });

  if (asaasConfigurado() && asaasCustomerId) {
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 3);

    const cobranca = await criarCobrancaAvulsaAsaas({
      asaasCustomerId,
      valor: valorTotal,
      formaPagamento: (texto(dados, "formaPagamento") as FormaPagamentoAvulso | null) || "PIX",
      vencimentoEm: vencimento.toISOString().slice(0, 10),
      descricao: `${pedido.numero} — ${item.nome}${quantidade > 1 ? ` (${quantidade}x)` : ""}`,
      referenciaExterna: `AVULSO:GESTAO_ATIVOS:${pedido.id}`,
    });

    if (!cobranca.ok) {
      // Sem cobrança gerada, o pedido fica sem jeito de ser pago sozinho —
      // melhor desfazer e deixar tentar de novo do que deixar um pedido
      // parado sem link de pagamento nenhum.
      await prisma.pedido.delete({ where: { id: pedido.id } });
      return { erro: `Não foi possível gerar a cobrança: ${cobranca.erro}` };
    }

    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { asaasCobrancaId: cobranca.dados.id, linkPagamento: cobranca.dados.invoiceUrl },
    });

    if (cnpjParaSalvar || organizacao.asaasCustomerId !== asaasCustomerId) {
      await prisma.organizacao.update({
        where: { id: organizacao.id },
        data: { asaasCustomerId, ...(cnpjParaSalvar ? { cnpj: cnpjParaSalvar } : {}) },
      });
    }
  }

  await registrar({
    acao: "CRIAR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Pedido",
    entidadeId: pedido.id,
    detalhe: { numero: pedido.numero, item: item.nome, quantidade, valorTotal },
  });

  revalidatePath("/painel/avulsos");
  return { ok: true };
}

/**
 * Marca o pedido como pago — o miolo que tanto a confirmação manual quanto o
 * webhook do Asaas usam.
 *
 * Idempotente de propósito: o Asaas pode reenviar o mesmo evento mais de uma
 * vez, e um pedido que já saiu de AGUARDANDO_PAGAMENTO não deve ser tocado de
 * novo — por isso devolve `false` sem fazer nada, em vez de sobrescrever.
 */
export async function aplicarPagamentoPedido(
  pedidoId: string,
  formaPagamento: string | null,
  usuarioId: string | null = null
): Promise<boolean> {
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido || pedido.situacao !== "AGUARDANDO_PAGAMENTO") return false;

  const item = AVULSO_POR_CHAVE[pedido.item];

  await prisma.pedido.update({
    where: { id: pedidoId },
    data: {
      situacao: item?.prazoUteis && item.prazoUteis > 0 ? "EM_EXECUCAO" : "PAGO",
      formaPagamento,
      pagoEm: new Date(),
      // O prazo passa a contar do pagamento, não do pedido.
      prometidoAte: item?.prazoUteis ? prazoDeEntrega(item.prazoUteis) : null,
    },
  });

  await registrar({
    acao: "EDITAR",
    organizacaoId: pedido.organizacaoId,
    usuarioId,
    entidade: "Pedido",
    entidadeId: pedidoId,
    detalhe: { numero: pedido.numero, pagamentoConfirmado: true, valor: Number(pedido.valorTotal), formaPagamento },
  });

  return true;
}

/**
 * Confirmação MANUAL — exceção para quando o pagamento aconteceu fora do
 * Asaas (depósito, dinheiro) ou a cobrança automática falhou. O caminho
 * normal, hoje, é o webhook em `/api/webhooks/asaas` confirmar sozinho.
 */
export async function confirmarPagamento(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  if (usuario.papel !== "DONO" && !usuario.admin) {
    return { erro: "Somente o responsável pela empresa pode confirmar um pagamento." };
  }

  const pedidoId = texto(dados, "pedidoId");
  if (!pedidoId) return { erro: "Pedido não informado." };

  const pedido = await prisma.pedido.findFirst({ where: { id: pedidoId, organizacaoId: organizacao.id } });
  if (!pedido) return { erro: "Pedido não encontrado." };
  if (pedido.situacao !== "AGUARDANDO_PAGAMENTO") return { erro: "Este pedido não está aguardando pagamento." };

  const aplicado = await aplicarPagamentoPedido(pedidoId, texto(dados, "formaPagamento"), usuario.id);
  if (!aplicado) return { erro: "Este pedido não está mais aguardando pagamento." };

  // Confirmar por fora encerra também a cobrança automática, se existir —
  // sem isso o Asaas continuaria cobrando por um pedido já pago de outro jeito.
  if (pedido.asaasCobrancaId) {
    await cancelarCobrancaAvulsaAsaas(pedido.asaasCobrancaId).catch(() => {});
  }

  revalidatePath("/painel/avulsos");
  return { ok: true };
}

export async function cancelarPedido(pedidoId: string): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  const pedido = await prisma.pedido.findFirst({ where: { id: pedidoId, organizacaoId: organizacao.id } });
  if (!pedido) return { erro: "Pedido não encontrado." };

  if (pedido.situacao === "ENTREGUE") {
    return { erro: "Pedido já entregue não pode ser cancelado. Peça o estorno pelo suporte." };
  }

  // Cancela a cobrança pendente no Asaas também — sem isso, o cliente
  // continuaria vendo (e podendo pagar) uma fatura de um pedido cancelado.
  if (pedido.asaasCobrancaId && pedido.situacao === "AGUARDANDO_PAGAMENTO") {
    await cancelarCobrancaAvulsaAsaas(pedido.asaasCobrancaId).catch(() => {});
  }

  await prisma.pedido.update({ where: { id: pedidoId }, data: { situacao: "CANCELADO" } });

  await registrar({
    acao: "EDITAR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Pedido",
    entidadeId: pedidoId,
    detalhe: { numero: pedido.numero, cancelado: true },
  });

  revalidatePath("/painel/avulsos");
  return { ok: true };
}

// ---------------------------------------------------------------------
// Consumo do plano
// ---------------------------------------------------------------------

/**
 * Soma uma unidade ao consumo do mês.
 *
 * Chamado pelos pontos que consomem cota: leitura por IA, assinatura
 * eletrônica, consulta a bureau e geração de documento.
 */
export async function registrarConsumo(organizacaoId: string, tipo: string, quantidade = 1): Promise<void> {
  const competencia = competenciaAtual();

  await prisma.consumo.upsert({
    where: { organizacaoId_tipo_competencia: { organizacaoId, tipo, competencia } },
    create: { organizacaoId, tipo, competencia, quantidade },
    update: { quantidade: { increment: quantidade } },
  });
}

export type UsoDoMes = {
  tipo: string;
  rotulo: string;
  usado: number;
  incluido: number;
  restante: number;
  estourou: boolean;
};

const ROTULOS: Record<string, string> = {
  LEITURA_IA: "Leituras de documento",
  ASSINATURA: "Assinaturas eletrônicas",
  BUREAU: "Consultas a bureau",
  DOCUMENTO: "Documentos gerados",
};

/** Quanto já foi usado do que o plano inclui, neste mês. */
export async function usoDoMes(): Promise<UsoDoMes[]> {
  const { organizacao } = await exigirSessao();

  const consumos = await prisma.consumo.findMany({
    where: { organizacaoId: organizacao.id, competencia: competenciaAtual() },
  });

  const plano = PLANO_POR_CHAVE[organizacao.plano];

  const incluido: Record<string, number> = {
    LEITURA_IA: plano?.limites.leiturasIaPorMes ?? 0,
    ASSINATURA: plano?.limites.assinaturasPorMes ?? 0,
    BUREAU: plano?.limites.consultasBureauPorMes ?? 0,
    DOCUMENTO: plano?.limites.documentosPorMes ?? 0,
  };

  return Object.keys(ROTULOS).map((tipo) => {
    const usado = consumos.find((c) => c.tipo === tipo)?.quantidade ?? 0;
    const cota = incluido[tipo] ?? 0;

    return {
      tipo,
      rotulo: ROTULOS[tipo],
      usado,
      incluido: cota,
      restante: Math.max(0, cota - usado),
      estourou: cota > 0 && usado >= cota,
    };
  });
}
