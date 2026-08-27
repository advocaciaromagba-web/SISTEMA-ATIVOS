/**
 * Acesso à sessão da solução de Licitações.
 *
 * Espelha `src/lib/sessao.ts` (Gestão de Ativos), mas contra
 * `LicitacaoUsuario`/`LicitacaoConta`. A mesma regra que não se quebra
 * continua valendo: nenhuma consulta roda sem o id vindo daqui — só que
 * aqui o id é `licitacaoContaId`, de uma conta que não existe do lado da
 * Gestão de Ativos.
 */
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptionsLicitacoes } from "@/lib/licitacoes/auth";
import { prisma } from "@/lib/prisma";
import type { LicitacaoConta, LicitacaoUsuario } from "@prisma/client";

export type SessaoLicitacoes = {
  usuario: LicitacaoUsuario;
  conta: LicitacaoConta;
};

export async function exigirSessaoLicitacoes(): Promise<SessaoLicitacoes> {
  const sessao = await getServerSession(authOptionsLicitacoes);
  const id = (sessao?.user as { id?: string } | undefined)?.id;

  if (!id) redirect("/licitacoes/entrar");

  const usuario = await prisma.licitacaoUsuario.findUnique({
    where: { id },
    include: { licitacaoConta: true },
  });

  if (!usuario || !usuario.ativo || !usuario.licitacaoConta.ativa) redirect("/licitacoes/entrar");

  const { licitacaoConta, ...dadosUsuario } = usuario;
  return { usuario: dadosUsuario as LicitacaoUsuario, conta: licitacaoConta };
}

export async function sessaoAtualLicitacoes(): Promise<SessaoLicitacoes | null> {
  const sessao = await getServerSession(authOptionsLicitacoes);
  const id = (sessao?.user as { id?: string } | undefined)?.id;
  if (!id) return null;

  const usuario = await prisma.licitacaoUsuario.findUnique({ where: { id }, include: { licitacaoConta: true } });
  if (!usuario || !usuario.ativo || !usuario.licitacaoConta.ativa) return null;

  const { licitacaoConta, ...dadosUsuario } = usuario;
  return { usuario: dadosUsuario as LicitacaoUsuario, conta: licitacaoConta };
}

export function podeEditarLicitacoes(usuario: LicitacaoUsuario): boolean {
  return usuario.papel !== "LEITOR";
}

export async function exigirEdicaoLicitacoes(): Promise<SessaoLicitacoes> {
  const sessao = await exigirSessaoLicitacoes();
  if (!podeEditarLicitacoes(sessao.usuario)) {
    throw new Error("Seu acesso é somente de leitura.");
  }
  return sessao;
}
