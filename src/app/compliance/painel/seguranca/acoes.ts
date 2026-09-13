"use server";

import { revalidatePath } from "next/cache";
import { generateSecret, generateURI, verify as verificarCodigoOtp } from "otplib";
import { prisma } from "@/lib/prisma";
import { exigirSessaoCompliance } from "@/lib/compliance/sessao";
import { marca } from "@/lib/marca";
import { cifrar } from "@/lib/seguranca/cofre";
import { arquivoComConteudo } from "@/lib/arquivo-enviado";

export type ResultadoSeguranca = { erro?: string; ok?: boolean; segredo?: string; uri?: string };

export async function gerarSegredoDuasEtapas(): Promise<ResultadoSeguranca> {
  const { usuario } = await exigirSessaoCompliance();

  const segredo = await generateSecret();
  const uri = generateURI({ secret: segredo, label: usuario.email, issuer: `${marca.nome} Compliance` });

  return { ok: true, segredo, uri };
}

export async function confirmarDuasEtapas(_anterior: ResultadoSeguranca, dados: FormData): Promise<ResultadoSeguranca> {
  const { usuario } = await exigirSessaoCompliance();

  const segredo = (dados.get("segredo")?.toString() ?? "").trim();
  const codigo = (dados.get("codigo")?.toString() ?? "").trim().replace(/\s/g, "");

  if (!segredo || !codigo) return { erro: "Preencha o código do aplicativo autenticador." };

  const conferencia = await verificarCodigoOtp({ secret: segredo, token: codigo });
  if (!conferencia.valid) return { erro: "Código inválido. Confira o horário do celular e tente de novo." };

  await prisma.complianceUsuario.update({
    where: { id: usuario.id },
    data: { totpSegredo: segredo, totpAtivado: true, totpAtivadoEm: new Date() },
  });

  revalidatePath("/compliance/painel/seguranca");
  return { ok: true };
}

export async function desligarDuasEtapas(): Promise<ResultadoSeguranca> {
  const { usuario } = await exigirSessaoCompliance();

  await prisma.complianceUsuario.update({
    where: { id: usuario.id },
    data: { totpSegredo: null, totpAtivado: false, totpAtivadoEm: null },
  });

  revalidatePath("/compliance/painel/seguranca");
  return { ok: true };
}

// ---------------------------------------------------------------------
// Certificado digital A1 da empresa
// ---------------------------------------------------------------------

/**
 * Guarda o certificado A1 do cliente, para emitir as certidões que o órgão
 * só entrega a quem está logado no gov.br (a federal da Receita/PGFN e as do
 * TJSP).
 *
 * Quem entra no gov.br é o cliente, com a credencial dele — a plataforma não
 * usa credencial própria para agir em nome de terceiro. Por isso o arquivo
 * fica na conta dele, cifrado, e só é usado nas consultas daquela conta.
 *
 * A3 não serve: vive em token ou cartão físico, que precisa estar plugado na
 * máquina de quem assina. Só A1 (arquivo .pfx/.p12) pode ser usado por um
 * servidor.
 */
export async function enviarCertificado(
  _anterior: ResultadoSeguranca,
  dados: FormData
): Promise<ResultadoSeguranca> {
  const { usuario, conta } = await exigirSessaoCompliance();

  if (usuario.papel !== "DONO") {
    return { erro: "Somente o responsável pela conta pode enviar o certificado digital." };
  }

  const arquivo = dados.get("certificado");
  const senha = (dados.get("senha")?.toString() ?? "").trim();
  const validade = (dados.get("validade")?.toString() ?? "").trim();

  if (!arquivoComConteudo(arquivo)) return { erro: "Selecione o arquivo do certificado (.pfx ou .p12)." };
  if (!/\.(pfx|p12)$/i.test(arquivo.name)) {
    return {
      erro:
        "O arquivo precisa ser um certificado A1, com extensão .pfx ou .p12. Certificado A3 (token ou cartão) " +
        "não pode ser usado pelo sistema — nesse caso, emita no site do órgão e anexe a certidão.",
    };
  }
  if (arquivo.size > 200 * 1024) return { erro: "Arquivo grande demais para um certificado — confira se é o .pfx certo." };
  if (!senha) return { erro: "Informe a senha do certificado." };

  const cifrada = cifrar(senha);
  if (!cifrada.ok) return { erro: cifrada.erro };

  await prisma.complianceConta.update({
    where: { id: conta.id },
    data: {
      certificadoArquivo: Buffer.from(await arquivo.arrayBuffer()),
      certificadoNome: arquivo.name,
      certificadoSenha: cifrada.valor,
      certificadoValidade: validade ? new Date(`${validade}T12:00:00`) : null,
      certificadoEnviadoEm: new Date(),
    },
  });

  revalidatePath("/compliance/painel/seguranca");
  return { ok: true };
}

export async function removerCertificado(): Promise<ResultadoSeguranca> {
  const { usuario, conta } = await exigirSessaoCompliance();

  if (usuario.papel !== "DONO") {
    return { erro: "Somente o responsável pela conta pode remover o certificado digital." };
  }

  await prisma.complianceConta.update({
    where: { id: conta.id },
    data: {
      certificadoArquivo: null,
      certificadoNome: null,
      certificadoSenha: null,
      certificadoValidade: null,
      certificadoEnviadoEm: null,
    },
  });

  revalidatePath("/compliance/painel/seguranca");
  return { ok: true };
}
