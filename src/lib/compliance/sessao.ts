/**
 * Acesso à sessão da solução de Compliance de Empresas.
 *
 * Espelha `src/lib/licitacoes/sessao.ts`, contra
 * `ComplianceUsuario`/`ComplianceConta`.
 */
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptionsCompliance } from "@/lib/compliance/auth";
import { prisma } from "@/lib/prisma";
import type { ComplianceConta, ComplianceUsuario } from "@prisma/client";

export type SessaoCompliance = {
  usuario: ComplianceUsuario;
  conta: ComplianceConta;
};

export async function exigirSessaoCompliance(): Promise<SessaoCompliance> {
  const sessao = await getServerSession(authOptionsCompliance);
  const id = (sessao?.user as { id?: string } | undefined)?.id;

  if (!id) redirect("/compliance/entrar");

  const usuario = await prisma.complianceUsuario.findUnique({
    where: { id },
    include: { complianceConta: true },
  });

  if (!usuario || !usuario.ativo || !usuario.complianceConta.ativa) redirect("/compliance/entrar");

  const { complianceConta, ...dadosUsuario } = usuario;
  return { usuario: dadosUsuario as ComplianceUsuario, conta: complianceConta };
}

export async function sessaoAtualCompliance(): Promise<SessaoCompliance | null> {
  const sessao = await getServerSession(authOptionsCompliance);
  const id = (sessao?.user as { id?: string } | undefined)?.id;
  if (!id) return null;

  const usuario = await prisma.complianceUsuario.findUnique({ where: { id }, include: { complianceConta: true } });
  if (!usuario || !usuario.ativo || !usuario.complianceConta.ativa) return null;

  const { complianceConta, ...dadosUsuario } = usuario;
  return { usuario: dadosUsuario as ComplianceUsuario, conta: complianceConta };
}

export function podeEditarCompliance(usuario: ComplianceUsuario): boolean {
  return usuario.papel !== "LEITOR";
}

export async function exigirEdicaoCompliance(): Promise<SessaoCompliance> {
  const sessao = await exigirSessaoCompliance();
  if (!podeEditarCompliance(sessao.usuario)) {
    throw new Error("Seu acesso é somente de leitura.");
  }
  return sessao;
}
