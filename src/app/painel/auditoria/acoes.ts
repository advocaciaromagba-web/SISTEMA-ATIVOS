"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirEdicao, exigirSessao } from "@/lib/sessao";
import { registrar } from "@/lib/registro";
import { executarAuditoria } from "@/lib/auditoria/executar";
import { CONSULTAS_GRATIS_TESTE } from "@/lib/planos";
import type { ResultadoAcao } from "../pessoas/acoes";

/** Teste grátis: só a cota de consultas definida em `planos.ts`, e nada além dela. */
async function testeEsgotado(organizacaoId: string, statusAssinatura: string): Promise<boolean> {
  if (statusAssinatura !== "TESTE") return false;
  const total = await prisma.auditoria.count({ where: { organizacaoId } });
  return total >= CONSULTAS_GRATIS_TESTE;
}

/** Roda a auditoria de uma parte, opcionalmente medida contra uma operação. */
export async function auditarParte(pessoaId: string, operacaoId?: string | null): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  if (await testeEsgotado(organizacao.id, organizacao.statusAssinatura)) {
    return {
      erro: `Seu teste grátis já usou as ${CONSULTAS_GRATIS_TESTE} consultas incluídas. Assine um plano para continuar auditando.`,
    };
  }

  const pessoa = await prisma.pessoa.findFirst({
    where: { id: pessoaId, organizacaoId: organizacao.id },
  });
  if (!pessoa) return { erro: "Parte não encontrada." };

  const operacao = operacaoId
    ? await prisma.operacao.findFirst({ where: { id: operacaoId, organizacaoId: organizacao.id } })
    : null;

  try {
    await executarAuditoria({ pessoa, operacao, usuario, organizacaoId: organizacao.id });
  } catch (erro) {
    return { erro: `A auditoria não pôde ser concluída: ${(erro as Error).message}` };
  }

  revalidatePath(`/painel/pessoas/${pessoaId}`);
  revalidatePath("/painel/auditoria");
  revalidatePath("/painel/pessoas");
  if (operacaoId) revalidatePath(`/painel/operacoes/${operacaoId}`);

  return { ok: true };
}

/**
 * Libera manualmente uma parte bloqueada pela auditoria.
 *
 * Exige justificativa escrita e só o dono da organização pode fazer. A
 * liberação não apaga o apontamento: ele continua no dossiê, agora com o nome
 * de quem assumiu a decisão. Uma trava que qualquer um contorna sem deixar
 * rastro não é trava.
 */
export async function liberarParte(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  if (usuario.papel !== "DONO") {
    return { erro: "Somente o responsável pela empresa pode liberar uma parte bloqueada." };
  }

  const pessoaId = (dados.get("pessoaId")?.toString() ?? "").trim();
  const justificativa = (dados.get("justificativa")?.toString() ?? "").trim();

  if (justificativa.length < 20) {
    return { erro: "Escreva a justificativa da liberação — no mínimo uma frase explicando a decisão." };
  }

  const pessoa = await prisma.pessoa.findFirst({
    where: { id: pessoaId, organizacaoId: organizacao.id },
  });
  if (!pessoa) return { erro: "Parte não encontrada." };
  if (!pessoa.bloqueada) return { erro: "Esta parte não está bloqueada." };

  await prisma.pessoa.update({
    where: { id: pessoaId },
    data: {
      bloqueada: false,
      liberadaPorId: usuario.id,
      liberadaEm: new Date(),
      justificativaLiberacao: justificativa,
    },
  });

  await registrar({
    acao: "EDITAR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Pessoa",
    entidadeId: pessoaId,
    detalhe: {
      liberacaoManual: true,
      parte: pessoa.nome,
      situacao: pessoa.situacaoCompliance,
      justificativa,
    },
  });

  revalidatePath(`/painel/pessoas/${pessoaId}`);
  revalidatePath("/painel/auditoria");
  return { ok: true };
}

/** Volta a bloquear uma parte liberada manualmente. */
export async function rebloquearParte(pessoaId: string): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  const pessoa = await prisma.pessoa.findFirst({ where: { id: pessoaId, organizacaoId: organizacao.id } });
  if (!pessoa) return { erro: "Parte não encontrada." };

  await prisma.pessoa.update({
    where: { id: pessoaId },
    data: { bloqueada: true, liberadaPorId: null, liberadaEm: null, justificativaLiberacao: null },
  });

  await registrar({
    acao: "EDITAR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Pessoa",
    entidadeId: pessoaId,
    detalhe: { rebloqueio: true, parte: pessoa.nome },
  });

  revalidatePath(`/painel/pessoas/${pessoaId}`);
  return { ok: true };
}

/** Lista o histórico de auditorias de uma parte, para comparar no tempo. */
export async function historicoDaParte(pessoaId: string) {
  const { organizacao } = await exigirSessao();

  return prisma.auditoria.findMany({
    where: { pessoaId, organizacaoId: organizacao.id },
    orderBy: { criadoEm: "desc" },
    take: 20,
  });
}
