"use server";

import { revalidatePath } from "next/cache";
import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { registrarAcaoAdmin } from "@/lib/admin/auditoria";
import { buscarConta, descritor, modelo } from "@/lib/admin/solucoes";

export type ResultadoAcaoAdmin = { erro?: string; ok?: string };

/**
 * Bloqueia a conta. Não apaga nada: o cliente perde o acesso, o dado fica.
 * Exige motivo escrito — bloqueio sem motivo registrado é bloqueio que
 * ninguém consegue explicar depois.
 */
export async function bloquearConta(_anterior: ResultadoAcaoAdmin, dados: FormData): Promise<ResultadoAcaoAdmin> {
  const admin = await exigirSessaoAdmin();

  const solucao = (dados.get("solucao") ?? "").toString();
  const id = (dados.get("id") ?? "").toString();
  const motivo = (dados.get("motivo") ?? "").toString().trim();

  if (!motivo) return { erro: "Escreva o motivo do bloqueio." };

  const d = descritor(solucao);
  const conta = await buscarConta(solucao, id);
  if (!d || !conta) return { erro: "Conta não encontrada." };
  if (conta.bloqueadoEm) return { erro: "Esta conta já está bloqueada." };

  await modelo(d.modeloConta).update({
    where: { id },
    data: { bloqueadoEm: new Date(), bloqueadoMotivo: motivo },
  });

  await registrarAcaoAdmin({
    admin,
    acao: "BLOQUEAR",
    solucao,
    alvoTipo: "CONTA",
    alvoId: id,
    resumo: `Bloqueou a conta “${conta.nome}” em ${d.rotulo}.`,
    detalhe: { motivo, contaNome: conta.nome, emailContato: conta.emailContato },
  });

  revalidatePath("/admin/painel/contas");
  revalidatePath(`/admin/painel/contas/${solucao}/${id}`);
  return { ok: "Conta bloqueada." };
}

export async function desbloquearConta(_anterior: ResultadoAcaoAdmin, dados: FormData): Promise<ResultadoAcaoAdmin> {
  const admin = await exigirSessaoAdmin();

  const solucao = (dados.get("solucao") ?? "").toString();
  const id = (dados.get("id") ?? "").toString();

  const d = descritor(solucao);
  const conta = await buscarConta(solucao, id);
  if (!d || !conta) return { erro: "Conta não encontrada." };
  if (!conta.bloqueadoEm) return { erro: "Esta conta não está bloqueada." };

  await modelo(d.modeloConta).update({
    where: { id },
    data: { bloqueadoEm: null, bloqueadoMotivo: null },
  });

  await registrarAcaoAdmin({
    admin,
    acao: "DESBLOQUEAR",
    solucao,
    alvoTipo: "CONTA",
    alvoId: id,
    resumo: `Desbloqueou a conta “${conta.nome}” em ${d.rotulo}.`,
    detalhe: { motivoAnterior: conta.bloqueadoMotivo },
  });

  revalidatePath("/admin/painel/contas");
  revalidatePath(`/admin/painel/contas/${solucao}/${id}`);
  return { ok: "Conta desbloqueada." };
}

/**
 * Apaga a conta e tudo que depende dela, de verdade e sem volta.
 *
 * Fica atrás de uma confirmação digitada — o nome exato da conta — porque
 * este botão não pode ser possível de apertar por engano. O registro da
 * exclusão sobrevive à conta: guarda nome, documento e e-mail no detalhe,
 * já que depois não haverá onde consultar.
 */
export async function excluirContaDefinitivo(
  _anterior: ResultadoAcaoAdmin,
  dados: FormData
): Promise<ResultadoAcaoAdmin> {
  const admin = await exigirSessaoAdmin();

  const solucao = (dados.get("solucao") ?? "").toString();
  const id = (dados.get("id") ?? "").toString();
  const confirmacao = (dados.get("confirmacao") ?? "").toString().trim();
  const motivo = (dados.get("motivo") ?? "").toString().trim();

  const d = descritor(solucao);
  const conta = await buscarConta(solucao, id);
  if (!d || !conta) return { erro: "Conta não encontrada." };

  if (confirmacao !== conta.nome) {
    return { erro: `Para apagar, digite exatamente o nome da conta: ${conta.nome}` };
  }
  if (!motivo) return { erro: "Escreva o motivo da exclusão definitiva." };

  // O registro é gravado ANTES de apagar: se a exclusão falhar no meio, fica
  // a tentativa registrada; se der certo, o registro já existe.
  await registrarAcaoAdmin({
    admin,
    acao: "EXCLUIR_DEFINITIVO",
    solucao,
    alvoTipo: "CONTA",
    alvoId: id,
    resumo: `Apagou definitivamente a conta “${conta.nome}” em ${d.rotulo}.`,
    detalhe: {
      motivo,
      contaNome: conta.nome,
      documento: conta.documento,
      emailContato: conta.emailContato,
      plano: conta.plano,
      statusAssinatura: conta.statusAssinatura,
      criadaEm: conta.criadoEm,
    },
  });

  try {
    await modelo(d.modeloConta).delete({ where: { id } });
  } catch (erro) {
    return {
      erro:
        "Não foi possível apagar: há registros ligados a esta conta que o banco não deixa remover. " +
        `Detalhe técnico: ${(erro as Error).message.slice(0, 200)}`,
    };
  }

  revalidatePath("/admin/painel/contas");
  return { ok: `Conta “${conta.nome}” apagada definitivamente.` };
}
