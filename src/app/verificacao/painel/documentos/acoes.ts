"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirEdicaoVerificacao } from "@/lib/verificacao/sessao";
import { CONSULTAS_GRATIS_TESTE } from "@/lib/planos";
import { iaConfigurada, perguntarJson, type BlocoConteudo } from "@/lib/ia/claude";

export type ResultadoAcao = { erro?: string; ok?: boolean };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

const TIPOS_DOCUMENTO = ["CERTIDAO", "CONTRATO_SOCIAL", "RG", "CPF", "OUTRO"];

/** Teste grátis: só a cota de documentos definida em `planos.ts`, e nada além dela. */
async function testeEsgotado(verificacaoContaId: string, statusAssinatura: string): Promise<boolean> {
  if (statusAssinatura !== "TESTE") return false;
  const total = await prisma.verificacaoDocumento.count({ where: { verificacaoContaId } });
  return total >= CONSULTAS_GRATIS_TESTE;
}

/**
 * Pede à IA um resumo do documento, quando configurada. Nunca derruba o
 * upload: sem chave, ou se a IA falhar, o documento fica salvo do mesmo
 * jeito — a impressão digital e o controle de validade não dependem dela.
 */
async function lerComIa(arquivo: Buffer, tipoArquivo: string | null): Promise<unknown | null> {
  if (!iaConfigurada()) return null;

  let bloco: BlocoConteudo | null = null;
  if (tipoArquivo === "application/pdf") {
    bloco = { type: "document", source: { type: "base64", media_type: "application/pdf", data: arquivo.toString("base64") } };
  } else if (tipoArquivo && tipoArquivo.startsWith("image/")) {
    bloco = { type: "image", source: { type: "base64", media_type: tipoArquivo, data: arquivo.toString("base64") } };
  } else {
    return null;
  }

  const resposta = await perguntarJson<Record<string, unknown>>({
    instrucao:
      "Você lê documentos para conferência de autenticidade. Identifique o tipo de documento, os dados " +
      "principais (nome, CPF/CNPJ, número, órgão emissor) e a data de validade se houver. Responda só em JSON, " +
      "com os campos: tipoIdentificado, dadosPrincipais (texto curto), validadeEncontrada (data ou null).",
    conteudo: [bloco],
  });

  return resposta.ok ? resposta.dados : { erro: resposta.erro };
}

export async function verificarDocumento(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoVerificacao();

  if (await testeEsgotado(conta.id, conta.statusAssinatura)) {
    return {
      erro: `Seu teste grátis já usou os ${CONSULTAS_GRATIS_TESTE} documentos incluídos. Assine um plano para continuar.`,
    };
  }

  const titulo = texto(dados, "titulo");
  const tipo = texto(dados, "tipo") ?? "OUTRO";
  const validaAte = texto(dados, "validaAte");
  const arquivo = dados.get("arquivo");

  if (!titulo) return { erro: "Dê um título para identificar este documento." };
  if (!TIPOS_DOCUMENTO.includes(tipo)) return { erro: "Tipo de documento desconhecido." };
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Selecione um arquivo." };
  if (arquivo.size > 15 * 1024 * 1024) return { erro: "Arquivo maior que 15 MB." };

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const hashSha256 = crypto.createHash("sha256").update(bytes).digest("hex");

  const leituraIa = await lerComIa(bytes, arquivo.type || null).catch((erro) => {
    console.error("Leitura por IA falhou:", erro);
    return null;
  });

  await prisma.verificacaoDocumento.create({
    data: {
      verificacaoContaId: conta.id,
      titulo,
      tipo,
      nomeArquivo: arquivo.name,
      arquivo: bytes,
      arquivoTipo: arquivo.type || null,
      hashSha256,
      validaAte: validaAte ? new Date(validaAte) : null,
      leituraIa: (leituraIa ?? undefined) as never,
      solicitadoPorId: usuario.id,
    },
  });

  revalidatePath("/verificacao/painel/documentos");
  return { ok: true };
}

export async function excluirDocumentoVerificacao(id: string): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoVerificacao();

  const doc = await prisma.verificacaoDocumento.findFirst({ where: { id, verificacaoContaId: conta.id } });
  if (!doc) return { erro: "Documento não encontrado." };

  await prisma.verificacaoDocumento.delete({ where: { id } });
  revalidatePath("/verificacao/painel/documentos");
  return { ok: true };
}
