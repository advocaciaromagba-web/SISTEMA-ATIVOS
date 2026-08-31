"use server";

import { revalidatePath } from "next/cache";
import { generateSecret, generateURI, verify as verificarCodigoOtp } from "otplib";
import { prisma } from "@/lib/prisma";
import { exigirSessaoDiligencia } from "@/lib/diligencia/sessao";
import { marca } from "@/lib/marca";

export type ResultadoSeguranca = { erro?: string; ok?: boolean; segredo?: string; uri?: string };

export async function gerarSegredoDuasEtapas(): Promise<ResultadoSeguranca> {
  const { usuario } = await exigirSessaoDiligencia();

  const segredo = await generateSecret();
  const uri = generateURI({ secret: segredo, label: usuario.email, issuer: `${marca.nome} Diligência` });

  return { ok: true, segredo, uri };
}

export async function confirmarDuasEtapas(_anterior: ResultadoSeguranca, dados: FormData): Promise<ResultadoSeguranca> {
  const { usuario } = await exigirSessaoDiligencia();

  const segredo = (dados.get("segredo")?.toString() ?? "").trim();
  const codigo = (dados.get("codigo")?.toString() ?? "").trim().replace(/\s/g, "");

  if (!segredo || !codigo) return { erro: "Preencha o código do aplicativo autenticador." };

  const conferencia = await verificarCodigoOtp({ secret: segredo, token: codigo });
  if (!conferencia.valid) return { erro: "Código inválido. Confira o horário do celular e tente de novo." };

  await prisma.diligenciaUsuario.update({
    where: { id: usuario.id },
    data: { totpSegredo: segredo, totpAtivado: true, totpAtivadoEm: new Date() },
  });

  revalidatePath("/diligencia/painel/seguranca");
  return { ok: true };
}

export async function desligarDuasEtapas(): Promise<ResultadoSeguranca> {
  const { usuario } = await exigirSessaoDiligencia();

  await prisma.diligenciaUsuario.update({
    where: { id: usuario.id },
    data: { totpSegredo: null, totpAtivado: false, totpAtivadoEm: null },
  });

  revalidatePath("/diligencia/painel/seguranca");
  return { ok: true };
}
