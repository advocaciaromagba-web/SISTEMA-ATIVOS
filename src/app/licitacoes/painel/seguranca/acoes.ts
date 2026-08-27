"use server";

import { revalidatePath } from "next/cache";
import { generateSecret, generateURI, verify as verificarCodigoOtp } from "otplib";
import { prisma } from "@/lib/prisma";
import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { marca } from "@/lib/marca";

export type ResultadoSeguranca = { erro?: string; ok?: boolean; segredo?: string; uri?: string };

/**
 * Gera um segredo novo e devolve para a tela mostrar — ainda não grava nada.
 * Só grava (e liga a verificação) quando o código de confirmação bate, em
 * `confirmarDuasEtapas`. Gerar e nunca confirmar não deixa a conta num
 * estado de segredo órfão.
 */
export async function gerarSegredoDuasEtapas(): Promise<ResultadoSeguranca> {
  const { usuario } = await exigirSessaoLicitacoes();

  const segredo = await generateSecret();
  const uri = generateURI({ secret: segredo, label: usuario.email, issuer: `${marca.nome} Licitações` });

  return { ok: true, segredo, uri };
}

export async function confirmarDuasEtapas(_anterior: ResultadoSeguranca, dados: FormData): Promise<ResultadoSeguranca> {
  const { usuario } = await exigirSessaoLicitacoes();

  const segredo = (dados.get("segredo")?.toString() ?? "").trim();
  const codigo = (dados.get("codigo")?.toString() ?? "").trim().replace(/\s/g, "");

  if (!segredo || !codigo) return { erro: "Preencha o código do aplicativo autenticador." };

  const conferencia = await verificarCodigoOtp({ secret: segredo, token: codigo });
  if (!conferencia.valid) return { erro: "Código inválido. Confira o horário do celular e tente de novo." };

  await prisma.licitacaoUsuario.update({
    where: { id: usuario.id },
    data: { totpSegredo: segredo, totpAtivado: true, totpAtivadoEm: new Date() },
  });

  revalidatePath("/licitacoes/painel/seguranca");
  return { ok: true };
}

export async function desligarDuasEtapas(): Promise<ResultadoSeguranca> {
  const { usuario } = await exigirSessaoLicitacoes();

  await prisma.licitacaoUsuario.update({
    where: { id: usuario.id },
    data: { totpSegredo: null, totpAtivado: false, totpAtivadoEm: null },
  });

  revalidatePath("/licitacoes/painel/seguranca");
  return { ok: true };
}
