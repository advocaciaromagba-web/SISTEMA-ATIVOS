"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEdicaoCompliance } from "@/lib/compliance/sessao";
import { somenteNumeros, validarDocumento, validarEmail } from "@/lib/validacao";
import { auditarPessoaDiligencia } from "@/lib/compliance/auditoria-pessoa";
import { configuracaoDaSolucao } from "@/lib/planos-solucao";

export type ResultadoAcao = { erro?: string; ok?: boolean };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

/**
 * Teste grátis: cota única de consultas, compartilhada entre empresas e
 * pessoas — é a mesma conta, a mesma assinatura, desde a fusão das duas
 * soluções em 14/09/2026.
 */
async function testeEsgotado(complianceContaId: string, statusAssinatura: string): Promise<boolean> {
  if (statusAssinatura !== "TESTE") return false;
  const [empresas, pessoas] = await Promise.all([
    prisma.complianceAuditoria.count({ where: { complianceContaId } }),
    prisma.diligenciaAuditoria.count({ where: { complianceContaId } }),
  ]);
  const { consultasGratisTeste } = await configuracaoDaSolucao("COMPLIANCE_EMPRESA");
  return empresas + pessoas >= consultasGratisTeste;
}

/**
 * Cria a pessoa e roda a auditoria automática, na hora — o cadastro passa
 * por due diligence sempre, não num botão à parte.
 */
export async function salvarPessoa(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  const nome = texto(dados, "nome");
  const documento = somenteNumeros(texto(dados, "documento") ?? "");
  const email = texto(dados, "emailContato");
  const dataNascimentoTexto = texto(dados, "dataNascimento");

  if (!nome) return { erro: "Informe o nome completo." };
  if (documento && !validarDocumento(documento, "PF")) return { erro: "CPF inválido — confira os números." };
  if (email && !validarEmail(email)) return { erro: "E-mail inválido." };

  if (documento) {
    const jaExiste = await prisma.diligenciaPessoa.findFirst({
      where: { complianceContaId: conta.id, documento },
      select: { id: true, nome: true },
    });
    if (jaExiste) return { erro: `Já existe uma pessoa cadastrada com este CPF: ${jaExiste.nome}.` };
  }

  const pessoa = await prisma.diligenciaPessoa.create({
    data: {
      complianceContaId: conta.id,
      nome,
      documento: documento || "",
      nomeMae: texto(dados, "nomeMae"),
      dataNascimento: dataNascimentoTexto ? new Date(dataNascimentoTexto) : null,
      uf: texto(dados, "uf")?.toUpperCase() ?? null,
      emailContato: email,
      telefone: somenteNumeros(texto(dados, "telefone")) || null,
    },
  });

  if (pessoa.documento && !(await testeEsgotado(conta.id, conta.statusAssinatura))) {
    try {
      await auditarPessoaDiligencia({ pessoa, usuario, complianceContaId: conta.id });
    } catch (erro) {
      console.error("Auditoria automática da pessoa falhou:", erro);
    }
  }

  revalidatePath("/compliance/painel/pessoas");
  redirect(`/compliance/painel/pessoas/${pessoa.id}`);
}

export async function reauditarPessoa(id: string): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  const pessoa = await prisma.diligenciaPessoa.findFirst({ where: { id, complianceContaId: conta.id } });
  if (!pessoa) return { erro: "Pessoa não encontrada." };

  if (await testeEsgotado(conta.id, conta.statusAssinatura)) {
    return {
      erro: `Seu teste grátis já usou as ${(await configuracaoDaSolucao("COMPLIANCE_EMPRESA")).consultasGratisTeste} consultas incluídas (empresas e pessoas somadas). Assine um plano para continuar auditando.`,
    };
  }

  await auditarPessoaDiligencia({ pessoa, usuario, complianceContaId: conta.id });

  revalidatePath(`/compliance/painel/pessoas/${id}`);
  return { ok: true };
}

/**
 * Libera manualmente uma pessoa bloqueada por restrição — exige o papel de
 * DONO e uma justificativa mínima, mesmo padrão do restante do sistema.
 */
export async function liberarPessoaDiligencia(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  if (usuario.papel !== "DONO") {
    return { erro: "Somente o responsável pela conta pode liberar uma pessoa bloqueada." };
  }

  const diligenciaPessoaId = texto(dados, "diligenciaPessoaId");
  const justificativa = texto(dados, "justificativa") ?? "";
  if (!diligenciaPessoaId) return { erro: "Pessoa não informada." };
  if (justificativa.length < 20) {
    return { erro: "Escreva a justificativa da liberação — no mínimo uma frase explicando a decisão." };
  }

  const pessoa = await prisma.diligenciaPessoa.findFirst({
    where: { id: diligenciaPessoaId, complianceContaId: conta.id },
  });
  if (!pessoa) return { erro: "Pessoa não encontrada." };

  await prisma.diligenciaPessoa.update({
    where: { id: diligenciaPessoaId },
    data: {
      bloqueada: false,
      liberadaPorNome: usuario.nome,
      liberadaEm: new Date(),
      justificativaLiberacao: justificativa,
    },
  });

  revalidatePath(`/compliance/painel/pessoas/${diligenciaPessoaId}`);
  return { ok: true };
}

export async function rebloquearPessoaDiligencia(diligenciaPessoaId: string): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();
  if (usuario.papel !== "DONO") {
    return { erro: "Somente o responsável pela conta pode bloquear novamente uma pessoa." };
  }

  const pessoa = await prisma.diligenciaPessoa.findFirst({
    where: { id: diligenciaPessoaId, complianceContaId: conta.id },
  });
  if (!pessoa) return { erro: "Pessoa não encontrada." };

  await prisma.diligenciaPessoa.update({
    where: { id: diligenciaPessoaId },
    data: { bloqueada: true, liberadaPorNome: null, liberadaEm: null, justificativaLiberacao: null },
  });

  revalidatePath(`/compliance/painel/pessoas/${diligenciaPessoaId}`);
  return { ok: true };
}
