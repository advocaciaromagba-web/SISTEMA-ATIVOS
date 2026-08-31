/**
 * Acesso à sessão da solução de Verificação de Documentos.
 *
 * Espelha `src/lib/compliance/sessao.ts`, contra
 * `VerificacaoUsuario`/`VerificacaoConta`.
 */
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptionsVerificacao } from "@/lib/verificacao/auth";
import { prisma } from "@/lib/prisma";
import type { VerificacaoConta, VerificacaoUsuario } from "@prisma/client";

export type SessaoVerificacao = {
  usuario: VerificacaoUsuario;
  conta: VerificacaoConta;
};

export async function exigirSessaoVerificacao(): Promise<SessaoVerificacao> {
  const sessao = await getServerSession(authOptionsVerificacao);
  const id = (sessao?.user as { id?: string } | undefined)?.id;

  if (!id) redirect("/verificacao/entrar");

  const usuario = await prisma.verificacaoUsuario.findUnique({
    where: { id },
    include: { verificacaoConta: true },
  });

  if (!usuario || !usuario.ativo || !usuario.verificacaoConta.ativa) redirect("/verificacao/entrar");

  const { verificacaoConta, ...dadosUsuario } = usuario;
  return { usuario: dadosUsuario as VerificacaoUsuario, conta: verificacaoConta };
}

export function podeEditarVerificacao(usuario: VerificacaoUsuario): boolean {
  return usuario.papel !== "LEITOR";
}

export async function exigirEdicaoVerificacao(): Promise<SessaoVerificacao> {
  const sessao = await exigirSessaoVerificacao();
  if (!podeEditarVerificacao(sessao.usuario)) {
    throw new Error("Seu acesso é somente de leitura.");
  }
  return sessao;
}
