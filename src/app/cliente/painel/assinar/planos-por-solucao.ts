import { PLANOS } from "@/lib/planos";
import { PLANOS_LICITACOES } from "@/lib/licitacoes/planos";
import { PLANOS_COMPLIANCE } from "@/lib/compliance/planos";
import { PLANOS_DILIGENCIA } from "@/lib/diligencia/planos";
import { PLANOS_VERIFICACAO } from "@/lib/verificacao/planos";

/** Só os campos que a tela de assinatura paga precisa — cada solução tem o próprio arquivo de planos completo. */
export type PlanoResumido = { chave: string; nome: string; precoMensal: number; precoAnual: number; destaque?: boolean };

/**
 * Consulta cadastral (Serasa) fica de fora de propósito: não tem plano por
 * mensalidade, é só crédito pré-pago — assinar ali continua sendo o botão
 * simples, sem passar por aqui.
 */
export const PLANOS_POR_SOLUCAO: Record<string, PlanoResumido[]> = {
  GESTAO_ATIVOS: PLANOS,
  LICITACOES: PLANOS_LICITACOES,
  COMPLIANCE_EMPRESA: PLANOS_COMPLIANCE,
  DILIGENCIA_PESSOA: PLANOS_DILIGENCIA,
  VERIFICACAO_DOCUMENTOS: PLANOS_VERIFICACAO,
};

export function planosDaSolucao(solucao: string): PlanoResumido[] | null {
  return PLANOS_POR_SOLUCAO[solucao] ?? null;
}
