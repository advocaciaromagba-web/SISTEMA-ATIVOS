"use server";

import { prisma } from "@/lib/prisma";
import { marca } from "@/lib/marca";
import { gerarTokenRedefinicao } from "@/lib/token-redefinicao-senha";
import { enviarEmailRedefinicaoSenha } from "@/lib/email";

export type ResultadoEsqueciSenha = { enviado?: boolean; erro?: string };

/**
 * Sempre responde "enviado" quando o e-mail é válido, exista ou não conta com
 * ele — não dá para alguém descobrir, tentando e-mails, quem tem conta na
 * solução.
 */
export async function pedirRedefinicaoSenha(
  _anterior: ResultadoEsqueciSenha,
  dados: FormData
): Promise<ResultadoEsqueciSenha> {
  const email = (dados.get("email")?.toString() ?? "").trim().toLowerCase();
  if (!email) return { erro: "Informe o e-mail da conta." };

  const usuario = await prisma.complianceUsuario.findUnique({ where: { email } });

  if (usuario && usuario.ativo) {
    const { token, hash, expiraEm } = gerarTokenRedefinicao();
    await prisma.complianceUsuario.update({
      where: { id: usuario.id },
      data: { resetTokenHash: hash, resetTokenExpiraEm: expiraEm },
    });

    const link = `${marca.site}/compliance/redefinir-senha?token=${token}`;
    try {
      await enviarEmailRedefinicaoSenha({ destinatario: email, nomeSolucao: "Compliance de Empresas", link });
    } catch (err: any) {
      console.error("[email] Falha ao enviar redefinição de senha (compliance):", err.message);
      return { erro: "Não foi possível enviar o e-mail agora. Tente novamente em instantes." };
    }
  }

  return { enviado: true };
}
