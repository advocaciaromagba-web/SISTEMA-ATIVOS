"use server";

import { revalidatePath } from "next/cache";
import { generateSecret, generateURI, verify as verificarCodigoOtp } from "otplib";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { marca } from "@/lib/marca";
import { cifrar } from "@/lib/seguranca/cofre";
import { arquivoComConteudo } from "@/lib/arquivo-enviado";
import { lerTitularDoCertificado, formatarDocumentoDoCertificado } from "@/lib/licitacoes/assinatura";

export type ResultadoSeguranca = {
  erro?: string;
  ok?: boolean;
  segredo?: string;
  uri?: string;
  /** Titular lido do certificado recém-enviado, para a tela confirmar quem vai assinar. */
  titular?: string;
  /** Ressalva que não impede o uso, mas quem cadastrou precisa saber. */
  aviso?: string;
};

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

// ---------------------------------------------------------------------
// Certificado digital A1 — para ASSINAR as declarações do envelope
// ---------------------------------------------------------------------

/**
 * Guarda o certificado A1 do licitante, que é com o que as declarações do
 * envelope saem assinadas digitalmente (ICP-Brasil).
 *
 * Diferente do envio equivalente no Compliance, aqui o certificado é ABERTO
 * na hora do envio, com a senha informada: se a senha estiver errada ou o
 * arquivo não for um A1 legível, o erro aparece agora — e não na véspera do
 * certame, quando o licitante for gerar o envelope.
 */
export async function enviarCertificadoLicitacoes(
  _anterior: ResultadoSeguranca,
  dados: FormData
): Promise<ResultadoSeguranca> {
  const { usuario, conta } = await exigirSessaoLicitacoes();

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
        "não pode ser usado pelo sistema, porque a chave privada não sai do dispositivo.",
    };
  }
  if (arquivo.size > 200 * 1024) return { erro: "Arquivo grande demais para um certificado — confira se é o .pfx certo." };
  if (!senha) return { erro: "Informe a senha do certificado." };

  const pfx = Buffer.from(await arquivo.arrayBuffer());

  // Conferência imediata: abre o certificado antes de guardar.
  const titular = lerTitularDoCertificado(pfx, senha);
  if (!titular.ok) return { erro: titular.erro };

  if (titular.titular.validoAte && titular.titular.validoAte < new Date()) {
    return {
      erro: `Este certificado venceu em ${titular.titular.validoAte.toLocaleDateString("pt-BR")}. Um documento assinado com certificado vencido é recusado no certame.`,
    };
  }

  const cifrada = cifrar(senha);
  if (!cifrada.ok) return { erro: cifrada.erro };

  const t = titular.titular;

  await prisma.licitacaoConta.update({
    where: { id: conta.id },
    data: {
      certificadoArquivo: pfx,
      certificadoNome: arquivo.name,
      certificadoSenha: cifrada.valor,
      // A validade real vem do próprio certificado; o campo digitado só entra
      // se o certificado não trouxer a data.
      certificadoValidade: t.validoAte ?? (validade ? new Date(`${validade}T12:00:00`) : null),
      certificadoEnviadoEm: new Date(),
      certificadoDados: {
        titular: t.nome,
        documento: t.documento,
        emissor: t.emissor,
        numeroSerie: t.numeroSerie,
        validoDe: t.validoDe?.toISOString() ?? null,
        validoAte: t.validoAte?.toISOString() ?? null,
        certificadosNaCadeia: t.certificadosNaCadeia,
        temCadeia: t.temCadeia,
      } as never,
    },
  });

  revalidatePath("/licitacoes/painel/seguranca");
  return {
    ok: true,
    titular: t.documento ? `${t.nome} (${formatarDocumentoDoCertificado(t.documento)})` : t.nome,
    // Aviso, não bloqueio: sem a AC junto, a assinatura continua válida, mas
    // o validador pode não conseguir montar a cadeia sozinho.
    aviso: t.temCadeia
      ? undefined
      : "Atenção: este arquivo trouxe só o certificado da empresa, sem a Autoridade Certificadora. A assinatura sai mesmo assim, mas alguns validadores podem não conseguir montar a cadeia de confiança. Se o seu emissor oferecer o .pfx 'com cadeia completa', prefira aquele.",
  };
}

export async function removerCertificadoLicitacoes(): Promise<ResultadoSeguranca> {
  const { usuario, conta } = await exigirSessaoLicitacoes();

  if (usuario.papel !== "DONO") {
    return { erro: "Somente o responsável pela conta pode remover o certificado digital." };
  }

  await prisma.licitacaoConta.update({
    where: { id: conta.id },
    data: {
      certificadoArquivo: null,
      certificadoNome: null,
      certificadoSenha: null,
      certificadoValidade: null,
      certificadoEnviadoEm: null,
      certificadoDados: Prisma.DbNull,
    },
  });

  revalidatePath("/licitacoes/painel/seguranca");
  return { ok: true };
}
