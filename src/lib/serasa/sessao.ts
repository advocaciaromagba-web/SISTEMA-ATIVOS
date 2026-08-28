/**
 * Acesso à sessão da solução de Consulta Cadastral SERASA.
 *
 * Espelha `src/lib/compliance/sessao.ts`, contra `SerasaUsuario`/`SerasaConta`.
 */
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptionsSerasa } from "@/lib/serasa/auth";
import { prisma } from "@/lib/prisma";
import type { SerasaConta, SerasaUsuario } from "@prisma/client";

export type SessaoSerasa = {
  usuario: SerasaUsuario;
  conta: SerasaConta;
};

export async function exigirSessaoSerasa(): Promise<SessaoSerasa> {
  const sessao = await getServerSession(authOptionsSerasa);
  const id = (sessao?.user as { id?: string } | undefined)?.id;

  if (!id) redirect("/serasa/entrar");

  const usuario = await prisma.serasaUsuario.findUnique({
    where: { id },
    include: { serasaConta: true },
  });

  if (!usuario || !usuario.ativo || !usuario.serasaConta.ativa) redirect("/serasa/entrar");

  const { serasaConta, ...dadosUsuario } = usuario;
  return { usuario: dadosUsuario as SerasaUsuario, conta: serasaConta };
}

export function podeEditarSerasa(usuario: SerasaUsuario): boolean {
  return usuario.papel !== "LEITOR";
}

export async function exigirEdicaoSerasa(): Promise<SessaoSerasa> {
  const sessao = await exigirSessaoSerasa();
  if (!podeEditarSerasa(sessao.usuario)) {
    throw new Error("Seu acesso é somente de leitura.");
  }
  return sessao;
}
