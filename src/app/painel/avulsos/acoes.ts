"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirEdicao, exigirSessao } from "@/lib/sessao";
import { registrar } from "@/lib/registro";
import { AVULSO_POR_CHAVE, competenciaAtual, prazoDeEntrega } from "@/lib/avulsos";
import { PLANO_POR_CHAVE } from "@/lib/planos";
import type { ResultadoAcao } from "../pessoas/acoes";

const texto = (d: FormData, chave: string) => (d.get(chave)?.toString() ?? "").trim() || null;

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
 * Cria um pedido avulso.
 *
 * O pedido nasce aguardando pagamento e NÃO executa nada até ser pago. É de
 * propósito: serviço entregue antes de pago vira cobrança difícil, e consulta
 * paga por unidade não pode ser disparada por engano.
 *
 * A ligação com o meio de pagamento entra em `linkPagamento` — hoje preenchido
 * à mão pelo operador; quando o Asaas for configurado, é aqui que a cobrança
 * passa a ser criada sozinha.
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
 * Marca o pedido como pago.
 *
 * Hoje é confirmação manual de quem opera a plataforma. Quando o Asaas estiver
 * ligado, o webhook de pagamento chama esta mesma função — por isso ela já
 * registra a forma de pagamento e a data.
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

  const item = AVULSO_POR_CHAVE[pedido.item];

  await prisma.pedido.update({
    where: { id: pedidoId },
    data: {
      situacao: item?.prazoUteis && item.prazoUteis > 0 ? "EM_EXECUCAO" : "PAGO",
      formaPagamento: texto(dados, "formaPagamento"),
      pagoEm: new Date(),
      // O prazo passa a contar do pagamento, não do pedido.
      prometidoAte: item?.prazoUteis ? prazoDeEntrega(item.prazoUteis) : null,
    },
  });

  await registrar({
    acao: "EDITAR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Pedido",
    entidadeId: pedidoId,
    detalhe: { numero: pedido.numero, pagamentoConfirmado: true, valor: Number(pedido.valorTotal) },
  });

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
