"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { registrarAcaoAdmin } from "@/lib/admin/auditoria";
import { CHAVE_RENOVACAO_IA, CHAVE_SALDO_IA } from "./chaves";

export type ResultadoCustos = { erro?: string; ok?: string };



/**
 * Guarda o preço por milhão de tokens de um modelo.
 *
 * Exige a fonte porque preço de terceiro muda, e um número sem procedência
 * aqui vira relatório financeiro errado sem ninguém perceber.
 */
export async function salvarPrecoIa(_anterior: ResultadoCustos, dados: FormData): Promise<ResultadoCustos> {
  const admin = await exigirSessaoAdmin();

  const modelo = (dados.get("modelo") ?? "").toString().trim();
  const entrada = Number((dados.get("entrada") ?? "").toString().replace(",", "."));
  const saida = Number((dados.get("saida") ?? "").toString().replace(",", "."));
  const fonte = (dados.get("fonte") ?? "").toString().trim();

  if (!modelo) return { erro: "Informe o nome do modelo (ex.: claude-opus-5)." };
  if (!Number.isFinite(entrada) || entrada < 0) return { erro: "Preço de entrada inválido." };
  if (!Number.isFinite(saida) || saida < 0) return { erro: "Preço de saída inválido." };
  if (!fonte) return { erro: "Informe de onde tirou o preço (página consultada e data)." };

  await prisma.precoIa.upsert({
    where: { modelo },
    create: {
      modelo,
      usdPorMilhaoEntrada: entrada,
      usdPorMilhaoSaida: saida,
      fonte,
      informadoPor: admin.email,
    },
    update: { usdPorMilhaoEntrada: entrada, usdPorMilhaoSaida: saida, fonte, informadoPor: admin.email },
  });

  await registrarAcaoAdmin({
    admin,
    acao: "CONFIGURAR",
    alvoTipo: "PRECO_IA",
    alvoId: modelo,
    resumo: `Informou o preço da IA para o modelo ${modelo}: US$ ${entrada}/milhão de entrada, US$ ${saida}/milhão de saída.`,
    detalhe: { modelo, entrada, saida, fonte },
  });

  revalidatePath("/admin/painel/custos");
  return { ok: `Preço de ${modelo} salvo. Os custos passam a ser calculados a partir de agora.` };
}

/**
 * Registra a data de renovação e o saldo informado do crédito de IA.
 *
 * A API da Anthropic não devolve saldo com a chave de uso comum. Em vez de
 * fingir que lê, o sistema guarda o que uma pessoa informou, com a data em
 * que informou, e avisa quando a data de renovação se aproxima.
 */
export async function salvarRenovacaoIa(_anterior: ResultadoCustos, dados: FormData): Promise<ResultadoCustos> {
  const admin = await exigirSessaoAdmin();

  const data = (dados.get("renovacao") ?? "").toString().trim();
  const saldo = (dados.get("saldo") ?? "").toString().trim();

  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Data inválida." };

  await prisma.configAdmin.upsert({
    where: { chave: CHAVE_RENOVACAO_IA },
    create: { chave: CHAVE_RENOVACAO_IA, valor: data, atualizadoPor: admin.email },
    update: { valor: data, atualizadoPor: admin.email },
  });

  await prisma.configAdmin.upsert({
    where: { chave: CHAVE_SALDO_IA },
    create: { chave: CHAVE_SALDO_IA, valor: saldo, atualizadoPor: admin.email },
    update: { valor: saldo, atualizadoPor: admin.email },
  });

  await registrarAcaoAdmin({
    admin,
    acao: "CONFIGURAR",
    alvoTipo: "IA",
    resumo: `Informou renovação do crédito de IA para ${data || "(sem data)"} e saldo de ${saldo || "(não informado)"}.`,
    detalhe: { renovacao: data, saldo },
  });

  revalidatePath("/admin/painel/custos");
  return { ok: "Anotado." };
}

export async function resolverAlerta(_anterior: ResultadoCustos, dados: FormData): Promise<ResultadoCustos> {
  const admin = await exigirSessaoAdmin();
  const id = (dados.get("id") ?? "").toString();

  const alerta = await prisma.alertaSistema.findUnique({ where: { id } });
  if (!alerta) return { erro: "Alerta não encontrado." };

  await prisma.alertaSistema.update({
    where: { id },
    data: { resolvido: true, resolvidoEm: new Date(), resolvidoPor: admin.email },
  });

  await registrarAcaoAdmin({
    admin,
    acao: "CONFIGURAR",
    alvoTipo: "ALERTA",
    alvoId: id,
    resumo: `Marcou como resolvido o alerta: ${alerta.titulo}`,
  });

  revalidatePath("/admin/painel/custos");
  revalidatePath("/admin/painel");
  return { ok: "Alerta encerrado." };
}
