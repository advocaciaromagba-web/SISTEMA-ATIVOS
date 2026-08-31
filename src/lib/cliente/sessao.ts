import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptionsCliente } from "@/lib/cliente/auth";
import { prisma } from "@/lib/prisma";
import type { Cliente } from "@prisma/client";

export async function exigirSessaoCliente(): Promise<Cliente> {
  const sessao = await getServerSession(authOptionsCliente);
  const id = (sessao?.user as { id?: string } | undefined)?.id;

  if (!id) redirect("/cliente/entrar");

  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente || !cliente.ativo) redirect("/cliente/entrar");

  return cliente;
}
