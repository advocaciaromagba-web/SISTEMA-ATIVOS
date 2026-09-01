"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirSessaoCliente } from "@/lib/cliente/sessao";
import { emitirSessaoSolucao, solucaoTemSso } from "@/lib/cliente/sso";
import { DIAS_DE_TESTE } from "@/lib/planos";
import { PRECO_CONSULTA } from "@/lib/serasa/fonte";
import { cancelarAssinaturaAsaas } from "@/lib/asaas/cliente";
import { PAINEL_DA_SOLUCAO, type ResultadoAcao } from "./constantes";

const SOLUCOES_VALIDAS = Object.keys(PAINEL_DA_SOLUCAO);

/**
 * Cria (ou reativa) a conta daquela solução para o Cliente, reaproveitando
 * o hash de senha que ele já tem — nunca precisa da senha em texto puro
 * de novo, porque o hash do bcrypt já é autossuficiente para conferir a
 * senha depois, em qualquer uma das seis tabelas.
 *
 * Cada solução mora na sua própria tabela, sem relação nenhuma com as
 * outras — só o e-mail em comum permite reconhecer que é "a mesma pessoa"
 * entre uma e outra, e só por fora, aqui, nunca dentro do dado de cada
 * solução.
 */
export async function criarOuReativarContaDaSolucao(
  solucao: string,
  cliente: { nome: string; email: string; passwordHash: string }
): Promise<void> {
  const testeExpiraEm = new Date(Date.now() + DIAS_DE_TESTE * 24 * 60 * 60 * 1000);

  switch (solucao) {
    case "GESTAO_ATIVOS": {
      const existente = await prisma.usuario.findUnique({ where: { email: cliente.email } });
      if (existente) {
        await prisma.usuario.update({ where: { id: existente.id }, data: { ativo: true } });
        await prisma.organizacao.update({ where: { id: existente.organizacaoId }, data: { ativa: true } });
        return;
      }
      await prisma.organizacao.create({
        data: {
          tipo: "PJ",
          nome: cliente.nome,
          emailContato: cliente.email,
          formaCobranca: "ASSINATURA",
          plano: "TESTE",
          statusAssinatura: "TESTE",
          testeExpiraEm,
          usuarios: {
            create: { nome: cliente.nome, email: cliente.email, passwordHash: cliente.passwordHash, papel: "DONO", admin: false },
          },
        },
      });
      return;
    }
    case "LICITACOES": {
      const existente = await prisma.licitacaoUsuario.findUnique({ where: { email: cliente.email } });
      if (existente) {
        await prisma.licitacaoUsuario.update({ where: { id: existente.id }, data: { ativo: true } });
        await prisma.licitacaoConta.update({ where: { id: existente.licitacaoContaId }, data: { ativa: true } });
        return;
      }
      await prisma.licitacaoConta.create({
        data: {
          tipo: "PJ",
          nome: cliente.nome,
          formaCobranca: "ASSINATURA",
          plano: "TESTE",
          statusAssinatura: "TESTE",
          testeExpiraEm,
          usuarios: { create: { nome: cliente.nome, email: cliente.email, passwordHash: cliente.passwordHash, papel: "DONO" } },
        },
      });
      return;
    }
    case "COMPLIANCE_EMPRESA": {
      const existente = await prisma.complianceUsuario.findUnique({ where: { email: cliente.email } });
      if (existente) {
        await prisma.complianceUsuario.update({ where: { id: existente.id }, data: { ativo: true } });
        await prisma.complianceConta.update({ where: { id: existente.complianceContaId }, data: { ativa: true } });
        return;
      }
      await prisma.complianceConta.create({
        data: {
          tipo: "PJ",
          nome: cliente.nome,
          formaCobranca: "ASSINATURA",
          plano: "TESTE",
          statusAssinatura: "TESTE",
          testeExpiraEm,
          usuarios: { create: { nome: cliente.nome, email: cliente.email, passwordHash: cliente.passwordHash, papel: "DONO" } },
        },
      });
      return;
    }
    case "DILIGENCIA_PESSOA": {
      const existente = await prisma.diligenciaUsuario.findUnique({ where: { email: cliente.email } });
      if (existente) {
        await prisma.diligenciaUsuario.update({ where: { id: existente.id }, data: { ativo: true } });
        await prisma.diligenciaConta.update({ where: { id: existente.diligenciaContaId }, data: { ativa: true } });
        return;
      }
      await prisma.diligenciaConta.create({
        data: {
          tipo: "PJ",
          nome: cliente.nome,
          formaCobranca: "ASSINATURA",
          plano: "TESTE",
          statusAssinatura: "TESTE",
          testeExpiraEm,
          usuarios: { create: { nome: cliente.nome, email: cliente.email, passwordHash: cliente.passwordHash, papel: "DONO" } },
        },
      });
      return;
    }
    case "VERIFICACAO_DOCUMENTOS": {
      const existente = await prisma.verificacaoUsuario.findUnique({ where: { email: cliente.email } });
      if (existente) {
        await prisma.verificacaoUsuario.update({ where: { id: existente.id }, data: { ativo: true } });
        await prisma.verificacaoConta.update({ where: { id: existente.verificacaoContaId }, data: { ativa: true } });
        return;
      }
      await prisma.verificacaoConta.create({
        data: {
          tipo: "PJ",
          nome: cliente.nome,
          formaCobranca: "ASSINATURA",
          plano: "TESTE",
          statusAssinatura: "TESTE",
          testeExpiraEm,
          usuarios: { create: { nome: cliente.nome, email: cliente.email, passwordHash: cliente.passwordHash, papel: "DONO" } },
        },
      });
      return;
    }
    case "CONSULTA_CADASTRAL_SERASA": {
      const existente = await prisma.serasaUsuario.findUnique({ where: { email: cliente.email } });
      if (existente) {
        await prisma.serasaUsuario.update({ where: { id: existente.id }, data: { ativo: true } });
        await prisma.serasaConta.update({ where: { id: existente.serasaContaId }, data: { ativa: true } });
        return;
      }
      await prisma.serasaConta.create({
        data: {
          tipo: "PJ",
          nome: cliente.nome,
          saldoCredito: PRECO_CONSULTA * 2,
          statusAssinatura: "TESTE",
          testeExpiraEm,
          usuarios: { create: { nome: cliente.nome, email: cliente.email, passwordHash: cliente.passwordHash, papel: "DONO" } },
        },
      });
      return;
    }
  }
}

export async function desativarContaDaSolucao(solucao: string, email: string): Promise<void> {
  switch (solucao) {
    case "GESTAO_ATIVOS":
      await prisma.usuario.updateMany({ where: { email }, data: { ativo: false } });
      return;
    case "LICITACOES":
      await prisma.licitacaoUsuario.updateMany({ where: { email }, data: { ativo: false } });
      return;
    case "COMPLIANCE_EMPRESA":
      await prisma.complianceUsuario.updateMany({ where: { email }, data: { ativo: false } });
      return;
    case "DILIGENCIA_PESSOA":
      await prisma.diligenciaUsuario.updateMany({ where: { email }, data: { ativo: false } });
      return;
    case "VERIFICACAO_DOCUMENTOS":
      await prisma.verificacaoUsuario.updateMany({ where: { email }, data: { ativo: false } });
      return;
    case "CONSULTA_CADASTRAL_SERASA":
      await prisma.serasaUsuario.updateMany({ where: { email }, data: { ativo: false } });
      return;
  }
}

/**
 * Vira o status "de verdade" da conta na solução, de TESTE para ATIVA no
 * plano pago — chamado só pelo webhook do Asaas, quando a primeira cobrança
 * é confirmada. Nunca chamado a partir de uma ação do próprio cliente: quem
 * libera o plano pago é a confirmação do pagamento, não um clique.
 */
export async function ativarPlanoPagoDaSolucao(solucao: string, email: string, plano: string): Promise<void> {
  const dados = { statusAssinatura: "ATIVA", plano };
  switch (solucao) {
    case "GESTAO_ATIVOS": {
      const usuario = await prisma.usuario.findUnique({ where: { email } });
      if (usuario) await prisma.organizacao.update({ where: { id: usuario.organizacaoId }, data: dados });
      return;
    }
    case "LICITACOES": {
      const usuario = await prisma.licitacaoUsuario.findUnique({ where: { email } });
      if (usuario) await prisma.licitacaoConta.update({ where: { id: usuario.licitacaoContaId }, data: dados });
      return;
    }
    case "COMPLIANCE_EMPRESA": {
      const usuario = await prisma.complianceUsuario.findUnique({ where: { email } });
      if (usuario) await prisma.complianceConta.update({ where: { id: usuario.complianceContaId }, data: dados });
      return;
    }
    case "DILIGENCIA_PESSOA": {
      const usuario = await prisma.diligenciaUsuario.findUnique({ where: { email } });
      if (usuario) await prisma.diligenciaConta.update({ where: { id: usuario.diligenciaContaId }, data: dados });
      return;
    }
    case "VERIFICACAO_DOCUMENTOS": {
      const usuario = await prisma.verificacaoUsuario.findUnique({ where: { email } });
      if (usuario) await prisma.verificacaoConta.update({ where: { id: usuario.verificacaoContaId }, data: dados });
      return;
    }
  }
}

/** Cobrança vencida sem pagar — trava o acesso sem apagar nada, até regularizar. */
export async function marcarInadimplenteDaSolucao(solucao: string, email: string): Promise<void> {
  switch (solucao) {
    case "GESTAO_ATIVOS": {
      const usuario = await prisma.usuario.findUnique({ where: { email } });
      if (usuario) await prisma.organizacao.update({ where: { id: usuario.organizacaoId }, data: { statusAssinatura: "INADIMPLENTE" } });
      return;
    }
    case "LICITACOES": {
      const usuario = await prisma.licitacaoUsuario.findUnique({ where: { email } });
      if (usuario) await prisma.licitacaoConta.update({ where: { id: usuario.licitacaoContaId }, data: { statusAssinatura: "INADIMPLENTE" } });
      return;
    }
    case "COMPLIANCE_EMPRESA": {
      const usuario = await prisma.complianceUsuario.findUnique({ where: { email } });
      if (usuario) await prisma.complianceConta.update({ where: { id: usuario.complianceContaId }, data: { statusAssinatura: "INADIMPLENTE" } });
      return;
    }
    case "DILIGENCIA_PESSOA": {
      const usuario = await prisma.diligenciaUsuario.findUnique({ where: { email } });
      if (usuario) await prisma.diligenciaConta.update({ where: { id: usuario.diligenciaContaId }, data: { statusAssinatura: "INADIMPLENTE" } });
      return;
    }
    case "VERIFICACAO_DOCUMENTOS": {
      const usuario = await prisma.verificacaoUsuario.findUnique({ where: { email } });
      if (usuario) await prisma.verificacaoConta.update({ where: { id: usuario.verificacaoContaId }, data: { statusAssinatura: "INADIMPLENTE" } });
      return;
    }
  }
}

type UsuarioParaSso = { id: string; nome: string; email: string } & Record<string, unknown>;

async function buscarUsuarioDaSolucao(solucao: string, email: string): Promise<UsuarioParaSso | null> {
  switch (solucao) {
    case "GESTAO_ATIVOS":
      return prisma.usuario.findFirst({ where: { email, ativo: true } });
    case "LICITACOES":
      return prisma.licitacaoUsuario.findFirst({ where: { email, ativo: true } });
    case "COMPLIANCE_EMPRESA":
      return prisma.complianceUsuario.findFirst({ where: { email, ativo: true } });
    case "DILIGENCIA_PESSOA":
      return prisma.diligenciaUsuario.findFirst({ where: { email, ativo: true } });
    case "VERIFICACAO_DOCUMENTOS":
      return prisma.verificacaoUsuario.findFirst({ where: { email, ativo: true } });
    case "CONSULTA_CADASTRAL_SERASA":
      return prisma.serasaUsuario.findFirst({ where: { email, ativo: true } });
    default:
      return null;
  }
}

export async function assinarSolucao(solucao: string): Promise<ResultadoAcao> {
  const cliente = await exigirSessaoCliente();
  if (!SOLUCOES_VALIDAS.includes(solucao)) return { erro: "Solução desconhecida." };

  const existente = await prisma.clienteAssinatura.findUnique({
    where: { clienteId_solucao: { clienteId: cliente.id, solucao } },
  });
  if (existente?.status === "ATIVA") return { erro: "Você já assina esta solução." };

  await criarOuReativarContaDaSolucao(solucao, cliente);

  if (existente) {
    await prisma.clienteAssinatura.update({ where: { id: existente.id }, data: { status: "ATIVA", canceladaEm: null } });
  } else {
    await prisma.clienteAssinatura.create({ data: { clienteId: cliente.id, solucao, status: "ATIVA" } });
  }

  revalidatePath("/cliente/painel");
  return { ok: true };
}

export async function cancelarSolucao(solucao: string): Promise<ResultadoAcao> {
  const cliente = await exigirSessaoCliente();

  const assinatura = await prisma.clienteAssinatura.findUnique({
    where: { clienteId_solucao: { clienteId: cliente.id, solucao } },
  });
  if (!assinatura || assinatura.status !== "ATIVA") return { erro: "Você não assina esta solução." };

  // Cancela a cobrança recorrente primeiro — se isto falhar, é melhor parar
  // aqui do que desativar o acesso e o Asaas continuar cobrando por trás.
  if (assinatura.asaasSubscriptionId) {
    const resultado = await cancelarAssinaturaAsaas(assinatura.asaasSubscriptionId);
    if (!resultado.ok) return { erro: `Não foi possível cancelar a cobrança: ${resultado.erro}` };
  }

  await prisma.clienteAssinatura.update({
    where: { id: assinatura.id },
    data: { status: "CANCELADA", canceladaEm: new Date(), asaasSubscriptionId: null },
  });

  // Não apaga nada — só desativa o acesso. Os dados continuam guardados.
  await desativarContaDaSolucao(solucao, cliente.email);

  revalidatePath("/cliente/painel");
  return { ok: true };
}

export async function acessarSolucao(solucao: string): Promise<ResultadoAcao> {
  const cliente = await exigirSessaoCliente();

  const assinatura = await prisma.clienteAssinatura.findUnique({
    where: { clienteId_solucao: { clienteId: cliente.id, solucao } },
  });
  if (!assinatura || assinatura.status !== "ATIVA") return { erro: "Assine esta solução antes de acessar." };
  if (!solucaoTemSso(solucao)) return { erro: "Solução sem acesso direto configurado." };

  const usuario = await buscarUsuarioDaSolucao(solucao, cliente.email);
  if (!usuario) return { erro: "Conta desta solução não encontrada — tente assinar de novo." };

  await emitirSessaoSolucao(solucao, usuario);
  redirect(PAINEL_DA_SOLUCAO[solucao]);
}
