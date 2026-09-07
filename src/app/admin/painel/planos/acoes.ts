"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { registrarAcaoAdmin } from "@/lib/admin/auditoria";
import { descritor } from "@/lib/admin/solucoes";

export type ResultadoPlano = { erro?: string; ok?: string };

function valorMonetario(entrada: FormDataEntryValue | null): number | null {
  const texto = (entrada ?? "").toString().trim().replace(/\./g, "").replace(",", ".");
  if (!texto) return null;
  const n = Number(texto);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function listaDeLinhas(entrada: FormDataEntryValue | null): string[] {
  return (entrada ?? "")
    .toString()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Salva o preço e o conteúdo de um plano de UMA solução.
 *
 * A solução vai junto na chave: não existe "editar o plano Essencial" sem
 * dizer de qual solução. Isso é o que impede alterar o preço de uma e mexer
 * na outra sem querer.
 */
export async function salvarPlano(_anterior: ResultadoPlano, dados: FormData): Promise<ResultadoPlano> {
  const admin = await exigirSessaoAdmin();

  const solucao = (dados.get("solucao") ?? "").toString();
  const chave = (dados.get("chave") ?? "").toString().trim().toUpperCase();

  if (!descritor(solucao)) return { erro: "Solução desconhecida." };
  if (!/^[A-Z0-9_]{2,30}$/.test(chave)) {
    return { erro: "O identificador do plano deve ter de 2 a 30 letras maiúsculas, números ou _ (ex.: ESSENCIAL)." };
  }

  const nome = (dados.get("nome") ?? "").toString().trim();
  if (!nome) return { erro: "Dê um nome ao plano." };

  const precoMensal = valorMonetario(dados.get("precoMensal"));
  const precoAnual = valorMonetario(dados.get("precoAnual"));
  if (precoMensal === null) return { erro: "Preço mensal inválido." };
  if (precoAnual === null) return { erro: "Preço anual inválido." };

  const paraQuem = (dados.get("paraQuem") ?? "").toString().trim() || null;
  const inclui = listaDeLinhas(dados.get("inclui"));
  const naoInclui = listaDeLinhas(dados.get("naoInclui"));
  const destaque = dados.get("destaque") === "sim";
  const ativo = dados.get("ativo") !== "nao";
  const ordem = Number((dados.get("ordem") ?? "0").toString()) || 0;

  const anterior = await prisma.planoSolucao.findUnique({ where: { solucao_chave: { solucao, chave } } });

  await prisma.planoSolucao.upsert({
    where: { solucao_chave: { solucao, chave } },
    create: { solucao, chave, nome, paraQuem, precoMensal, precoAnual, inclui, naoInclui, destaque, ativo, ordem },
    update: { nome, paraQuem, precoMensal, precoAnual, inclui, naoInclui, destaque, ativo, ordem },
  });

  const rotulo = descritor(solucao)?.rotulo ?? solucao;

  await registrarAcaoAdmin({
    admin,
    acao: anterior ? "EDITAR" : "CRIAR",
    solucao,
    alvoTipo: "PLANO",
    alvoId: chave,
    resumo: anterior
      ? `Alterou o plano ${nome} de ${rotulo}: mensal R$ ${Number(anterior.precoMensal).toFixed(2)} → R$ ${precoMensal.toFixed(2)}, anual R$ ${Number(anterior.precoAnual).toFixed(2)} → R$ ${precoAnual.toFixed(2)}.`
      : `Criou o plano ${nome} em ${rotulo}: mensal R$ ${precoMensal.toFixed(2)}, anual R$ ${precoAnual.toFixed(2)}.`,
    detalhe: {
      antes: anterior
        ? { precoMensal: Number(anterior.precoMensal), precoAnual: Number(anterior.precoAnual), ativo: anterior.ativo }
        : null,
      depois: { precoMensal, precoAnual, ativo },
    },
  });

  revalidatePath("/admin/painel/planos");
  return {
    ok:
      `Plano salvo. Vale para novas assinaturas: quem já assinou continua sendo cobrado pelo valor ` +
      `contratado, porque a cobrança recorrente já está criada no Asaas com aquele preço.`,
  };
}

/** Regras de teste grátis, por solução. */
export async function salvarConfiguracao(_anterior: ResultadoPlano, dados: FormData): Promise<ResultadoPlano> {
  const admin = await exigirSessaoAdmin();

  const solucao = (dados.get("solucao") ?? "").toString();
  if (!descritor(solucao)) return { erro: "Solução desconhecida." };

  const dias = Number((dados.get("diasDeTeste") ?? "").toString());
  const consultas = Number((dados.get("consultasGratisTeste") ?? "").toString());

  if (!Number.isInteger(dias) || dias < 0 || dias > 365) return { erro: "Dias de teste deve ser um número de 0 a 365." };
  if (!Number.isInteger(consultas) || consultas < 0 || consultas > 10000) {
    return { erro: "Consultas grátis deve ser um número de 0 a 10000." };
  }

  const anterior = await prisma.configuracaoSolucao.findUnique({ where: { solucao } });

  await prisma.configuracaoSolucao.upsert({
    where: { solucao },
    create: { solucao, diasDeTeste: dias, consultasGratisTeste: consultas, atualizadoPor: admin.email },
    update: { diasDeTeste: dias, consultasGratisTeste: consultas, atualizadoPor: admin.email },
  });

  await registrarAcaoAdmin({
    admin,
    acao: "CONFIGURAR",
    solucao,
    alvoTipo: "CONFIGURACAO_SOLUCAO",
    alvoId: solucao,
    resumo: `Alterou o teste grátis de ${descritor(solucao)?.rotulo ?? solucao}: ${dias} dias, ${consultas} análises.`,
    detalhe: {
      antes: anterior ? { dias: anterior.diasDeTeste, consultas: anterior.consultasGratisTeste } : null,
      depois: { dias, consultas },
    },
  });

  revalidatePath("/admin/painel/planos");
  return { ok: "Regras de teste salvas." };
}
