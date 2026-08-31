"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashDoToken } from "@/lib/token-redefinicao-senha";

export type ResultadoRedefinirSenha = { redefinida?: boolean; erro?: string };

export async function redefinirSenha(
  _anterior: ResultadoRedefinirSenha,
  dados: FormData
): Promise<ResultadoRedefinirSenha> {
  const token = (dados.get("token")?.toString() ?? "").trim();
  const senha = dados.get("senha")?.toString() ?? "";
  const confirmacao = dados.get("confirmacao")?.toString() ?? "";

  if (!token) return { erro: "Link inválido — peça um novo em 'esqueci minha senha'." };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== confirmacao) return { erro: "As senhas não coincidem." };

  const hash = hashDoToken(token);
  const usuario = await prisma.licitacaoUsuario.findUnique({ where: { resetTokenHash: hash } });

  if (!usuario || !usuario.resetTokenExpiraEm || usuario.resetTokenExpiraEm < new Date()) {
    return { erro: "Este link expirou ou já foi usado. Peça um novo em 'esqueci minha senha'." };
  }

  const passwordHash = await bcrypt.hash(senha, 12);
  await prisma.licitacaoUsuario.update({
    where: { id: usuario.id },
    data: { passwordHash, resetTokenHash: null, resetTokenExpiraEm: null },
  });

  return { redefinida: true };
}
