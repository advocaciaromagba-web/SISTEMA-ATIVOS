/**
 * Acesso à sessão da solução Agrojud.
 *
 * Espelha `src/lib/diligencia/sessao.ts`, contra `AgroUsuario`/`AgroConta`.
 */
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptionsAgro } from "@/lib/agro/auth";
import { prisma } from "@/lib/prisma";
import type { AgroConta, AgroUsuario } from "@prisma/client";

export type SessaoAgro = {
  usuario: AgroUsuario;
  conta: AgroConta;
};

export async function exigirSessaoAgro(): Promise<SessaoAgro> {
  const sessao = await getServerSession(authOptionsAgro);
  const id = (sessao?.user as { id?: string } | undefined)?.id;

  if (!id) redirect("/agrojud/entrar");

  const usuario = await prisma.agroUsuario.findUnique({
    where: { id },
    include: { agroConta: true },
  });

  if (!usuario || !usuario.ativo || !usuario.agroConta.ativa) redirect("/agrojud/entrar");

  const { agroConta, ...dadosUsuario } = usuario;
  return { usuario: dadosUsuario as AgroUsuario, conta: agroConta };
}

export function podeEditarAgro(usuario: AgroUsuario): boolean {
  return usuario.papel !== "LEITOR";
}

export async function exigirEdicaoAgro(): Promise<SessaoAgro> {
  const sessao = await exigirSessaoAgro();
  if (!podeEditarAgro(sessao.usuario)) {
    throw new Error("Seu acesso é somente de leitura.");
  }
  return sessao;
}
