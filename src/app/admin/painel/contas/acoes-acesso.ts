"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { registrarAcaoAdmin } from "@/lib/admin/auditoria";
import { buscarConta, descritor, modelo } from "@/lib/admin/solucoes";
import { marcarCookieAcesso } from "@/lib/admin/acesso";
import { emitirSessaoSolucao } from "@/lib/cliente/sso";

export type ResultadoAcesso = { erro?: string };

/** Mesma duração da sessão da solução emitida pela ponte. */
const OITO_HORAS = 8 * 60 * 60;

/**
 * Entra na conta do cliente como se fosse ele.
 *
 * Reaproveita a MESMA ponte de sessão que o hub do cliente já usa
 * (`emitirSessaoSolucao`): não existe caminho paralelo nem sessão especial —
 * o que é emitido aqui é a sessão normal daquela solução, para um usuário
 * real dela. O que muda é que fica registrado, e que a tarja vermelha
 * aparece enquanto durar.
 */
export async function entrarComoCliente(_anterior: ResultadoAcesso, dados: FormData): Promise<ResultadoAcesso> {
  const admin = await exigirSessaoAdmin();

  const solucao = (dados.get("solucao") ?? "").toString();
  const contaId = (dados.get("id") ?? "").toString();
  const motivo = (dados.get("motivo") ?? "").toString().trim();

  if (!motivo) return { erro: "Escreva o motivo do acesso. Ele fica no registro." };

  const d = descritor(solucao);
  const conta = await buscarConta(solucao, contaId);
  if (!d || !conta) return { erro: "Conta não encontrada." };

  // Um usuário real e ativo daquela conta — a sessão emitida é a dele.
  const usuario = (await modelo(d.modeloUsuario).findFirst({
    where: { [d.campoContaNoUsuario]: contaId, ativo: true },
    orderBy: { criadoEm: "asc" },
  })) as (Record<string, unknown> & { id: string; nome: string; email: string; papel?: string }) | null;

  if (!usuario) {
    return { erro: "Esta conta não tem nenhum usuário ativo — não há sessão para emitir." };
  }

  const acesso = await prisma.adminAcesso.create({
    data: {
      administradorId: admin.id,
      solucao,
      contaId,
      contaNome: conta.nome,
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      motivo,
    },
  });

  await registrarAcaoAdmin({
    admin,
    acao: "ACESSAR_COMO",
    solucao,
    alvoTipo: "CONTA",
    alvoId: contaId,
    resumo: `Entrou na conta “${conta.nome}” (${d.rotulo}) como ${usuario.email}.`,
    detalhe: { motivo, acessoId: acesso.id, usuarioEmail: usuario.email },
  });

  await emitirSessaoSolucao(solucao, {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    [d.campoContaNoUsuario]: contaId,
    papel: usuario.papel ?? "ADMIN",
  });

  marcarCookieAcesso(acesso.id, OITO_HORAS);

  redirect(d.painel);
}
