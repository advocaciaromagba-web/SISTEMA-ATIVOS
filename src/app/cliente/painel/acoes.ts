"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessaoCliente } from "@/lib/cliente/sessao";
import { emitirSessaoSolucao, solucaoTemSso } from "@/lib/cliente/sso";
import { PAINEL_DA_SOLUCAO, type ResultadoAcao } from "./constantes";

const SOLUCOES_VALIDAS = Object.keys(PAINEL_DA_SOLUCAO);

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
    case "AGROJUD":
      return prisma.agroUsuario.findFirst({ where: { email, ativo: true } });
    default:
      return null;
  }
}

export async function acessarSolucao(solucao: string): Promise<ResultadoAcao> {
  const cliente = await exigirSessaoCliente();

  if (!solucaoTemSso(solucao)) return { erro: "Solução sem acesso direto configurado." };

  // A autorização é a própria conta existir e estar ativa naquela solução.
  // Antes dependia de um registro de assinatura do hub — que deixou de ser
  // criado aqui, porque agora quem cria conta é o cadastro de cada solução.
  const usuario = await buscarUsuarioDaSolucao(solucao, cliente.email);
  if (!usuario) return { erro: "Você ainda não tem conta nesta solução. Comece pela página de planos dela." };

  await emitirSessaoSolucao(solucao, usuario);
  redirect(PAINEL_DA_SOLUCAO[solucao]);
}

