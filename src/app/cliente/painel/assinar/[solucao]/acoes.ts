"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirSessaoCliente } from "@/lib/cliente/sessao";
import { DIAS_DE_TESTE } from "@/lib/planos";
import { solucao as buscarSolucao } from "@/lib/solucoes";
import {
  asaasConfigurado,
  criarClienteAsaas,
  criarAssinaturaAsaas,
  type FormaPagamento,
  type CicloCobranca,
} from "@/lib/asaas/cliente";
import { criarOuReativarContaDaSolucao } from "../../acoes";
import { planosDaSolucao } from "../planos-por-solucao";
import type { ResultadoAcao } from "../../constantes";

function somenteDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

function documentoValido(v: string): boolean {
  const d = somenteDigitos(v);
  return d.length === 11 || d.length === 14; // CPF ou CNPJ, sem validar dígito verificador
}

/**
 * Assina de verdade: cria a conta da solução em TESTE (acesso imediato,
 * igual já era) e programa no Asaas a primeira cobrança para quando o teste
 * acabar. Ninguém paga nada agora — o Asaas só cobra na data marcada, e é a
 * confirmação do pagamento (via webhook) que promove a conta de TESTE para
 * o plano escolhido.
 */
export async function iniciarAssinaturaPaga(solucao: string, dados: FormData): Promise<ResultadoAcao> {
  if (!asaasConfigurado()) return { erro: "Pagamento não configurado no momento. Tente novamente mais tarde." };

  const planos = planosDaSolucao(solucao);
  const info = buscarSolucao(solucao);
  if (!planos || !info) return { erro: "Solução desconhecida." };

  const planoChave = (dados.get("plano")?.toString() ?? "").trim();
  const ciclo = (dados.get("ciclo")?.toString() ?? "MENSAL") as CicloCobranca;
  const formaPagamento = (dados.get("formaPagamento")?.toString() ?? "PIX") as FormaPagamento;
  const documento = (dados.get("documento")?.toString() ?? "").trim();

  const plano = planos.find((p) => p.chave === planoChave);
  if (!plano) return { erro: "Escolha um plano." };
  if (ciclo !== "MENSAL" && ciclo !== "ANUAL") return { erro: "Ciclo inválido." };
  if (formaPagamento !== "PIX" && formaPagamento !== "CREDIT_CARD") return { erro: "Forma de pagamento inválida." };

  const cliente = await exigirSessaoCliente();

  const existente = await prisma.clienteAssinatura.findUnique({
    where: { clienteId_solucao: { clienteId: cliente.id, solucao } },
  });
  if (existente?.status === "ATIVA") return { erro: "Você já assina esta solução." };

  // O documento só é pedido aqui, na primeira vez que alguém realmente vai
  // ser cobrado — não no cadastro, que continua só nome/e-mail/senha.
  let doc = cliente.documento;
  if (!doc) {
    if (!documento || !documentoValido(documento)) return { erro: "Informe um CPF ou CNPJ válido." };
    doc = somenteDigitos(documento);
  }

  let asaasCustomerId = cliente.asaasCustomerId;
  if (!asaasCustomerId) {
    const criado = await criarClienteAsaas({
      nome: cliente.nome,
      email: cliente.email,
      documento: doc,
      referenciaExterna: cliente.id,
    });
    if (!criado.ok) return { erro: `Não foi possível cadastrar o pagamento: ${criado.erro}` };
    asaasCustomerId = criado.dados.id;
  }

  if (asaasCustomerId !== cliente.asaasCustomerId || doc !== cliente.documento) {
    await prisma.cliente.update({ where: { id: cliente.id }, data: { asaasCustomerId, documento: doc } });
  }

  await criarOuReativarContaDaSolucao(solucao, cliente);

  const primeiraCobrancaEm = new Date(Date.now() + DIAS_DE_TESTE * 24 * 60 * 60 * 1000);
  const valor = ciclo === "ANUAL" ? plano.precoAnual : plano.precoMensal;

  const assinatura = await criarAssinaturaAsaas({
    asaasCustomerId,
    valor,
    formaPagamento,
    ciclo,
    primeiraCobrancaEm: primeiraCobrancaEm.toISOString().slice(0, 10),
    descricao: `${info.nome} — plano ${plano.nome} (${ciclo === "ANUAL" ? "anual" : "mensal"})`,
    referenciaExterna: `${cliente.id}:${solucao}`,
  });
  if (!assinatura.ok) return { erro: `Não foi possível programar a cobrança: ${assinatura.erro}` };

  if (existente) {
    await prisma.clienteAssinatura.update({
      where: { id: existente.id },
      data: { status: "ATIVA", canceladaEm: null, plano: plano.chave, ciclo, asaasSubscriptionId: assinatura.dados.id },
    });
  } else {
    await prisma.clienteAssinatura.create({
      data: { clienteId: cliente.id, solucao, status: "ATIVA", plano: plano.chave, ciclo, asaasSubscriptionId: assinatura.dados.id },
    });
  }

  revalidatePath("/cliente/painel");
  return { ok: true };
}
