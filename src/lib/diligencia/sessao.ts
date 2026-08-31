/**
 * Acesso à sessão da solução de Due Diligence de Pessoas.
 *
 * Espelha `src/lib/compliance/sessao.ts`, contra
 * `DiligenciaUsuario`/`DiligenciaConta`.
 */
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptionsDiligencia } from "@/lib/diligencia/auth";
import { prisma } from "@/lib/prisma";
import type { DiligenciaConta, DiligenciaUsuario } from "@prisma/client";

export type SessaoDiligencia = {
  usuario: DiligenciaUsuario;
  conta: DiligenciaConta;
};

export async function exigirSessaoDiligencia(): Promise<SessaoDiligencia> {
  const sessao = await getServerSession(authOptionsDiligencia);
  const id = (sessao?.user as { id?: string } | undefined)?.id;

  if (!id) redirect("/diligencia/entrar");

  const usuario = await prisma.diligenciaUsuario.findUnique({
    where: { id },
    include: { diligenciaConta: true },
  });

  if (!usuario || !usuario.ativo || !usuario.diligenciaConta.ativa) redirect("/diligencia/entrar");

  const { diligenciaConta, ...dadosUsuario } = usuario;
  return { usuario: dadosUsuario as DiligenciaUsuario, conta: diligenciaConta };
}

export function podeEditarDiligencia(usuario: DiligenciaUsuario): boolean {
  return usuario.papel !== "LEITOR";
}

export async function exigirEdicaoDiligencia(): Promise<SessaoDiligencia> {
  const sessao = await exigirSessaoDiligencia();
  if (!podeEditarDiligencia(sessao.usuario)) {
    throw new Error("Seu acesso é somente de leitura.");
  }
  return sessao;
}
