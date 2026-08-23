/**
 * Acesso à sessão nas telas e nas ações do servidor.
 *
 * REGRA QUE NÃO SE QUEBRA: nenhuma consulta ao banco roda sem o organizacaoId
 * vindo daqui. É essa linha que impede um assinante de enxergar a operação de
 * outro — e num sistema onde a informação É o ativo, isso é o produto.
 */
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Organizacao, Usuario } from "@prisma/client";

export type SessaoAtual = {
  usuario: Usuario;
  organizacao: Organizacao;
};

/** Sessão obrigatória: manda para o login se não houver. */
export async function exigirSessao(): Promise<SessaoAtual> {
  const sessao = await getServerSession(authOptions);
  const id = (sessao?.user as { id?: string } | undefined)?.id;

  if (!id) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    include: { organizacao: true },
  });

  if (!usuario || !usuario.ativo || !usuario.organizacao.ativa) redirect("/login");

  const { organizacao, ...dadosUsuario } = usuario;
  return { usuario: dadosUsuario as Usuario, organizacao };
}

/** Igual à anterior, mas devolve null em vez de redirecionar. Para uso em ações. */
export async function sessaoAtual(): Promise<SessaoAtual | null> {
  const sessao = await getServerSession(authOptions);
  const id = (sessao?.user as { id?: string } | undefined)?.id;
  if (!id) return null;

  const usuario = await prisma.usuario.findUnique({ where: { id }, include: { organizacao: true } });
  if (!usuario || !usuario.ativo || !usuario.organizacao.ativa) return null;

  const { organizacao, ...dadosUsuario } = usuario;
  return { usuario: dadosUsuario as Usuario, organizacao };
}

/** Somente leitura: usuários com papel LEITOR não podem alterar nada. */
export function podeEditar(usuario: Usuario): boolean {
  return usuario.papel !== "LEITOR";
}

export async function exigirEdicao(): Promise<SessaoAtual> {
  const sessao = await exigirSessao();
  if (!podeEditar(sessao.usuario)) {
    throw new Error("Seu acesso é somente de leitura.");
  }
  return sessao;
}

// ---------------------------------------------------------------------
// Assinatura
// ---------------------------------------------------------------------

export type SituacaoAssinatura = {
  liberado: boolean;
  motivo?: string;
  diasRestantes?: number;
};

/**
 * Diz se a organização pode usar o sistema. O período de teste continua
 * liberado; inadimplente vira somente leitura, não bloqueio total — cortar o
 * acesso ao próprio contrato de quem atrasou uma fatura gera mais problema
 * do que resolve.
 */
export function situacaoAssinatura(organizacao: Organizacao): SituacaoAssinatura {
  const agora = new Date();

  if (organizacao.statusAssinatura === "ATIVA") {
    if (organizacao.assinaturaAte && organizacao.assinaturaAte < agora) {
      return { liberado: false, motivo: "Assinatura vencida." };
    }
    return { liberado: true };
  }

  if (organizacao.statusAssinatura === "TESTE") {
    if (!organizacao.testeExpiraEm) return { liberado: true };
    const dias = Math.ceil((organizacao.testeExpiraEm.getTime() - agora.getTime()) / 86400000);
    if (dias <= 0) return { liberado: false, motivo: "Período de teste encerrado." };
    return { liberado: true, diasRestantes: dias };
  }

  if (organizacao.statusAssinatura === "INADIMPLENTE") {
    return { liberado: false, motivo: "Há fatura em aberto. O acesso está em modo somente leitura." };
  }

  return { liberado: false, motivo: "Assinatura cancelada." };
}
