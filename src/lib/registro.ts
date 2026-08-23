/**
 * Registro de auditoria.
 *
 * Tudo o que altera dado ou gera documento passa por aqui. O registro nunca é
 * editado nem apagado pelo sistema — é ele que responde "quem fez isso e
 * quando", pergunta que aparece justamente quando uma operação dá errado.
 */
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export type AcaoAuditoria =
  | "LOGIN"
  | "LOGIN_FALHA"
  | "LOGOUT"
  | "CRIAR"
  | "EDITAR"
  | "EXCLUIR"
  | "GERAR_DOCUMENTO"
  | "BAIXAR_DOCUMENTO"
  | "ENVIAR_ASSINATURA"
  | "CONSULTAR"
  | "EXPORTAR";

type Registro = {
  organizacaoId?: string | null;
  usuarioId?: string | null;
  acao: AcaoAuditoria;
  entidade?: string | null;
  entidadeId?: string | null;
  detalhe?: Record<string, unknown> | null;
};

/** Origem da requisição, quando houver uma. */
function origem(): { ip: string | null; agente: string | null } {
  try {
    const h = headers();
    const ip =
      h.get("cf-connecting-ip") ||
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    return { ip, agente: h.get("user-agent")?.slice(0, 200) ?? null };
  } catch {
    // Fora do ciclo de uma requisição (tarefa agendada, script) não há cabeçalho.
    return { ip: null, agente: null };
  }
}

export async function registrar(dados: Registro): Promise<void> {
  const { ip, agente } = origem();

  try {
    await prisma.logAuditoria.create({
      data: {
        organizacaoId: dados.organizacaoId ?? null,
        usuarioId: dados.usuarioId ?? null,
        acao: dados.acao,
        entidade: dados.entidade ?? null,
        entidadeId: dados.entidadeId ?? null,
        detalhe: (dados.detalhe ?? undefined) as never,
        ip,
        agente,
      },
    });
  } catch (erro) {
    // Auditoria que derruba a operação principal seria pior que auditoria
    // faltando: a falha é registrada no log do servidor e a ação continua.
    console.error("Falha ao registrar auditoria:", erro);
  }
}
