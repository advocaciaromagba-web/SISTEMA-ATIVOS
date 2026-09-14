"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEdicaoCompliance } from "@/lib/compliance/sessao";
import { somenteNumeros, validarNumeroProcessoCnj } from "@/lib/validacao";
import { analisarProcessoCompliance } from "@/lib/compliance/auditoria-processo";
import { configuracaoDaSolucao } from "@/lib/planos-solucao";

export type ResultadoAcao = { erro?: string; ok?: boolean };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

/**
 * Teste grátis: cota única de consultas, compartilhada entre empresas,
 * pessoas, processos e pareceres — é a mesma conta, a mesma assinatura.
 */
async function testeEsgotado(complianceContaId: string, statusAssinatura: string): Promise<boolean> {
  if (statusAssinatura !== "TESTE") return false;
  const [empresas, pessoas, processos, pareceres] = await Promise.all([
    prisma.complianceAuditoria.count({ where: { complianceContaId } }),
    prisma.diligenciaAuditoria.count({ where: { complianceContaId } }),
    prisma.complianceProcessoAnalise.count({ where: { complianceContaId } }),
    prisma.complianceParecer.count({ where: { complianceContaId } }),
  ]);
  const { consultasGratisTeste } = await configuracaoDaSolucao("COMPLIANCE_EMPRESA");
  return empresas + pessoas + processos + pareceres >= consultasGratisTeste;
}

/**
 * Cadastra o processo e roda a análise de regularidade automaticamente, na
 * hora — mesmo padrão de empresas e pessoas: a verificação acontece ao
 * salvar, não num botão à parte.
 */
export async function salvarProcesso(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  const numeroProcesso = somenteNumeros(texto(dados, "numeroProcesso") ?? "");
  const apelido = texto(dados, "apelido");

  if (!numeroProcesso || numeroProcesso.length !== 20) {
    return { erro: "Informe o número do processo no padrão CNJ (20 dígitos)." };
  }
  if (!validarNumeroProcessoCnj(numeroProcesso)) {
    return { erro: "O número do processo não confere com o padrão do CNJ. Revise os dígitos." };
  }

  const jaExiste = await prisma.complianceProcesso.findFirst({
    where: { complianceContaId: conta.id, numeroProcesso },
    select: { id: true, apelido: true },
  });
  if (jaExiste) return { erro: `Este processo já está cadastrado${jaExiste.apelido ? ` como "${jaExiste.apelido}"` : ""}.` };

  const processo = await prisma.complianceProcesso.create({
    data: { complianceContaId: conta.id, numeroProcesso, apelido },
  });

  if (!(await testeEsgotado(conta.id, conta.statusAssinatura))) {
    try {
      await analisarProcessoCompliance({ processo, usuario, complianceContaId: conta.id });
    } catch (erro) {
      console.error("Análise automática do processo falhou:", erro);
    }
  }

  revalidatePath("/compliance/painel/processos");
  redirect(`/compliance/painel/processos/${processo.id}`);
}

export async function reanalisarProcesso(id: string): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  const processo = await prisma.complianceProcesso.findFirst({ where: { id, complianceContaId: conta.id } });
  if (!processo) return { erro: "Processo não encontrado." };

  if (await testeEsgotado(conta.id, conta.statusAssinatura)) {
    return {
      erro: `Seu teste grátis já usou as ${(await configuracaoDaSolucao("COMPLIANCE_EMPRESA")).consultasGratisTeste} consultas incluídas (empresas, pessoas, processos e pareceres somados). Assine um plano para continuar.`,
    };
  }

  await analisarProcessoCompliance({ processo, usuario, complianceContaId: conta.id });

  revalidatePath(`/compliance/painel/processos/${id}`);
  return { ok: true };
}
