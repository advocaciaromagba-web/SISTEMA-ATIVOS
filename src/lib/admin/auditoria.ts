/**
 * Registro do que o administrador faz.
 *
 * Escreve e só. Não existe função de editar nem de apagar neste arquivo, e é
 * de propósito: registro que o próprio poderoso pode apagar não é registro,
 * é decoração. Se um dia for preciso expurgar algo por ordem legal, que seja
 * uma operação manual, deliberada e visível — não um botão na tela.
 *
 * Grava nome e e-mail em cópia: se a conta do administrador sumir, o que ele
 * fez continua legível.
 */
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Administrador } from "@prisma/client";

export type AcaoAdmin =
  | "LOGIN"
  | "LOGIN_FALHA"
  | "SAIR"
  | "VER"
  | "CRIAR"
  | "EDITAR"
  | "BLOQUEAR"
  | "DESBLOQUEAR"
  | "EXCLUIR_DEFINITIVO"
  | "EXPORTAR"
  | "ACESSAR_COMO"
  /** Entrou numa solução pela conta interna da Blackbird, não pela de um cliente. */
  | "ACESSO_INTERNO"
  | "ENCERRAR_ACESSO"
  | "CONFIGURAR";

/** Pega IP e navegador de quem está agindo, quando disponíveis. */
async function origem(): Promise<{ ip: string | null; agente: string | null }> {
  try {
    const h = await headers();
    const encaminhado = h.get("x-forwarded-for");
    return {
      ip: encaminhado ? encaminhado.split(",")[0].trim() : h.get("x-real-ip"),
      agente: h.get("user-agent"),
    };
  } catch {
    // Fora de um contexto de requisição (script, tarefa) não há cabeçalho.
    return { ip: null, agente: null };
  }
}

export async function registrarAcaoAdmin(params: {
  admin: Administrador;
  acao: AcaoAdmin;
  resumo: string;
  solucao?: string | null;
  alvoTipo?: string | null;
  alvoId?: string | null;
  detalhe?: unknown;
}): Promise<void> {
  const { ip, agente } = await origem();

  await prisma.adminAuditoria.create({
    data: {
      administradorId: params.admin.id,
      administradorNome: params.admin.nome,
      administradorEmail: params.admin.email,
      acao: params.acao,
      resumo: params.resumo,
      solucao: params.solucao ?? null,
      alvoTipo: params.alvoTipo ?? null,
      alvoId: params.alvoId ?? null,
      detalhe: (params.detalhe ?? null) as never,
      ip,
      agente,
    },
  });
}
