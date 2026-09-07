"use server";

import { revalidatePath } from "next/cache";
import { contaLogadaDaSolucao } from "@/lib/sessao-por-solucao";
import {
  assinarSolucao,
  cancelarAssinaturaDaSolucao,
  type ResultadoAssinatura,
} from "@/lib/assinatura-solucao";
import type { FormaPagamento, CicloCobranca } from "@/lib/asaas/cliente";

export type { ResultadoAssinatura };

/**
 * Assina a solução em que o cliente está logado.
 *
 * A solução vem do formulário, mas a CONTA vem da sessão daquela solução —
 * não do que o formulário mandar. Assim não existe forma de assinar em nome
 * de outra conta trocando um campo escondido.
 */
export async function assinar(_anterior: ResultadoAssinatura, dados: FormData): Promise<ResultadoAssinatura> {
  const solucao = (dados.get("solucao") ?? "").toString();

  const conta = await contaLogadaDaSolucao(solucao);
  if (!conta) return { erro: "Sessão não encontrada para esta solução." };
  if (!conta.podeEditar) return { erro: "Seu acesso é somente de leitura." };

  const resultado = await assinarSolucao({
    solucao,
    contaId: conta.contaId,
    emailContato: conta.emailContato,
    planoChave: (dados.get("plano") ?? "").toString().trim(),
    ciclo: ((dados.get("ciclo") ?? "MENSAL").toString() as CicloCobranca),
    formaPagamento: ((dados.get("formaPagamento") ?? "PIX").toString() as FormaPagamento),
    documentoInformado: (dados.get("documento") ?? "").toString(),
  });

  if (resultado.ok) revalidatePath(`/${solucao}`, "layout");
  return resultado;
}

export async function cancelar(_anterior: ResultadoAssinatura, dados: FormData): Promise<ResultadoAssinatura> {
  const solucao = (dados.get("solucao") ?? "").toString();
  const confirmacao = (dados.get("confirmacao") ?? "").toString().trim().toUpperCase();

  if (confirmacao !== "CANCELAR") return { erro: "Para cancelar, digite CANCELAR no campo de confirmação." };

  const conta = await contaLogadaDaSolucao(solucao);
  if (!conta) return { erro: "Sessão não encontrada para esta solução." };
  if (!conta.podeEditar) return { erro: "Seu acesso é somente de leitura." };

  const resultado = await cancelarAssinaturaDaSolucao({ solucao, contaId: conta.contaId });
  if (resultado.ok) revalidatePath(`/${solucao}`, "layout");
  return resultado;
}
