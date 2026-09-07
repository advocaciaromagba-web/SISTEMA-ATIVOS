/**
 * Acesso à sessão da administração.
 *
 * `exigirSessaoAdmin()` é o portão único: toda página e ação administrativa
 * passa por aqui. Conta desativada perde o acesso na hora, sem esperar a
 * sessão vencer.
 */
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptionsAdmin } from "./auth";
import { prisma } from "@/lib/prisma";
import type { Administrador } from "@prisma/client";

export async function exigirSessaoAdmin(): Promise<Administrador> {
  const sessao = await getServerSession(authOptionsAdmin);
  const id = (sessao?.user as { id?: string } | undefined)?.id;

  if (!id) redirect("/admin/entrar");

  const admin = await prisma.administrador.findUnique({ where: { id } });
  if (!admin || !admin.ativo) redirect("/admin/entrar");

  return admin;
}

/** Igual, mas sem redirecionar — para rotas de API. */
export async function sessaoAdminAtual(): Promise<Administrador | null> {
  const sessao = await getServerSession(authOptionsAdmin);
  const id = (sessao?.user as { id?: string } | undefined)?.id;
  if (!id) return null;

  const admin = await prisma.administrador.findUnique({ where: { id } });
  if (!admin || !admin.ativo) return null;

  return admin;
}
