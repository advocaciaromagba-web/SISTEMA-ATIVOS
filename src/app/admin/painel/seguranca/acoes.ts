"use server";

import { revalidatePath } from "next/cache";
import { generateSecret, generateURI, verify as verificarCodigoOtp } from "otplib";
import { prisma } from "@/lib/prisma";
import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { marca } from "@/lib/marca";
import { registrarAcaoAdmin } from "@/lib/admin/auditoria";

export type ResultadoSeguranca = { erro?: string; ok?: boolean; segredo?: string; uri?: string };

export async function gerarSegredoDuasEtapas(): Promise<ResultadoSeguranca> {
  const usuario = await exigirSessaoAdmin();

  const segredo = await generateSecret();
  const uri = generateURI({ secret: segredo, label: usuario.email, issuer: `${marca.nome} Administração` });

  return { ok: true, segredo, uri };
}

export async function confirmarDuasEtapas(_anterior: ResultadoSeguranca, dados: FormData): Promise<ResultadoSeguranca> {
  const usuario = await exigirSessaoAdmin();

  const segredo = (dados.get("segredo")?.toString() ?? "").trim();
  const codigo = (dados.get("codigo")?.toString() ?? "").trim().replace(/\s/g, "");

  if (!segredo || !codigo) return { erro: "Preencha o código do aplicativo autenticador." };

  const conferencia = await verificarCodigoOtp({ secret: segredo, token: codigo });
  if (!conferencia.valid) return { erro: "Código inválido. Confira o horário do celular e tente de novo." };

  await prisma.administrador.update({
    where: { id: usuario.id },
    data: { totpSegredo: segredo, totpAtivado: true, totpAtivadoEm: new Date() },
  });

  await registrarAcaoAdmin({ admin: usuario, acao: "CONFIGURAR", resumo: "Ativou a verificação em duas etapas na própria conta." });

  revalidatePath("/admin/painel/seguranca");
  return { ok: true };
}

export async function desligarDuasEtapas(): Promise<ResultadoSeguranca> {
  const usuario = await exigirSessaoAdmin();

  await prisma.administrador.update({
    where: { id: usuario.id },
    data: { totpSegredo: null, totpAtivado: false, totpAtivadoEm: null },
  });

  await registrarAcaoAdmin({ admin: usuario, acao: "CONFIGURAR", resumo: "DESLIGOU a verificação em duas etapas da própria conta." });

  revalidatePath("/admin/painel/seguranca");
  return { ok: true };
}
