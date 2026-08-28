"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirEdicaoSerasa } from "@/lib/serasa/sessao";
import { somenteAlfanumerico, validarDocumento } from "@/lib/validacao";
import { consultarSerasa, PRECO_CONSULTA } from "@/lib/serasa/fonte";

export type ResultadoAcao = { erro?: string; ok?: boolean };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

/**
 * Pede uma consulta cadastral nova.
 *
 * O crédito só sai do saldo se a consulta rodar de verdade — enquanto o
 * SERASA não estiver configurado, a consulta fica registrada com o motivo,
 * sem custar nada. Cobrar por uma resposta que não veio seria o tipo de
 * coisa que a auditoria desta mesma plataforma apontaria como problema.
 */
export async function novaConsulta(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoSerasa();

  const tipoPessoa = texto(dados, "tipoPessoa") === "PF" ? "PF" : "PJ";
  const documento = somenteAlfanumerico(texto(dados, "documento") ?? "");
  const nomeInformado = texto(dados, "nomeInformado");

  if (!documento || !validarDocumento(documento, tipoPessoa)) {
    return { erro: tipoPessoa === "PF" ? "CPF inválido — confira os números." : "CNPJ inválido — confira os números." };
  }

  const saldoAtual = Number(conta.saldoCredito);
  if (saldoAtual < PRECO_CONSULTA) {
    return { erro: `Saldo insuficiente. Esta consulta custa R$ ${PRECO_CONSULTA.toFixed(2)}, e o saldo atual é R$ ${saldoAtual.toFixed(2)}.` };
  }

  const consulta = await prisma.serasaConsulta.create({
    data: {
      serasaContaId: conta.id,
      documento,
      tipoPessoa,
      nomeInformado,
      situacao: "EM_ANDAMENTO",
      solicitadoPorId: usuario.id,
    },
  });

  const resposta = await consultarSerasa({ documento, tipoPessoa });

  if (resposta.ok) {
    await prisma.$transaction([
      prisma.serasaConsulta.update({
        where: { id: consulta.id },
        data: {
          situacao: "CONCLUIDA",
          resultado: resposta.resultado as never,
          creditoDebitado: PRECO_CONSULTA,
          concluidaEm: new Date(),
        },
      }),
      prisma.serasaConta.update({
        where: { id: conta.id },
        data: { saldoCredito: { decrement: PRECO_CONSULTA } },
      }),
    ]);
  } else {
    await prisma.serasaConsulta.update({
      where: { id: consulta.id },
      data: { situacao: "INDISPONIVEL", erro: resposta.erro, concluidaEm: new Date() },
    });
  }

  revalidatePath("/serasa/painel/consultas");
  return resposta.ok ? { ok: true } : { erro: resposta.erro };
}
