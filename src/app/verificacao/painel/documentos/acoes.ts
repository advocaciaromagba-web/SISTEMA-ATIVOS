"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirEdicaoVerificacao } from "@/lib/verificacao/sessao";
import { CONSULTAS_GRATIS_TESTE } from "@/lib/planos";
import { iaConfigurada, perguntarJson, type BlocoConteudo } from "@/lib/ia/claude";
import { somenteAlfanumerico } from "@/lib/validacao";
import { emitirCertidao, temEmissaoAutomatica } from "@/lib/auditoria/fontes/infosimples";
import { CERTIDAO_POR_CHAVE } from "@/lib/auditoria/certidoes";

export type ResultadoAcao = { erro?: string; ok?: boolean };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

const TIPOS_DOCUMENTO = ["CERTIDAO", "CONTRATO_SOCIAL", "RG", "CPF", "OUTRO"];

/**
 * Compara uma certidão recém-emitida contra a última apresentada para o
 * mesmo documento e o mesmo tipo — é a comparação que a solução promete: o
 * que a pessoa mostrou contra o que o órgão responde hoje.
 */
function compararResultado(
  apresentado: { resultado: string | null; apontamento: string | null; leituraIa: unknown },
  emitido: { resultado: string; apontamento: string | null }
): string | null {
  const leitura = apresentado.leituraIa as Record<string, unknown> | null;
  const resultadoApresentado =
    apresentado.resultado ??
    (leitura?.dadosPrincipais ? String(leitura.dadosPrincipais).toUpperCase() : null);

  if (apresentado.resultado === "NADA_CONSTA" && emitido.resultado === "CONSTA") {
    return (
      "Divergência: o documento apresentado dizia nada constar, mas a emissão de hoje encontrou apontamento — " +
      (emitido.apontamento ?? "sem detalhe") +
      ". Confira antes de aceitar o documento apresentado como válido."
    );
  }
  if (apresentado.resultado === "CONSTA" && emitido.resultado === "NADA_CONSTA") {
    return "O documento apresentado tinha apontamento, e a emissão de hoje não encontra mais nada — pode ter sido regularizado. Confira a data de cada um.";
  }
  if (!apresentado.resultado && !resultadoApresentado) {
    return "Documento apresentado sem resultado estruturado para comparar automaticamente — confira os dois manualmente.";
  }
  return null;
}

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
  const documento = somenteAlfanumerico(texto(dados, "documento") ?? "") || null;
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
      origem: "APRESENTADA",
      documento,
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

/**
 * Emite a certidão direto no órgão (Infosimples) e compara com a última
 * versão apresentada do mesmo tipo, para o mesmo CPF/CNPJ, quando existir.
 *
 * Mesma lógica de `emitirCertidaoAutomatica` da Gestão de Ativos — a fonte é
 * a mesma, compartilhada; o que muda é onde se grava.
 */
export async function emitirCertidaoVerificacao(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoVerificacao();

  if (await testeEsgotado(conta.id, conta.statusAssinatura)) {
    return {
      erro: `Seu teste grátis já usou os ${CONSULTAS_GRATIS_TESTE} documentos incluídos. Assine um plano para continuar.`,
    };
  }

  const chaveCertidao = texto(dados, "chaveCertidao");
  const documento = somenteAlfanumerico(texto(dados, "documento") ?? "");
  const nome = texto(dados, "nome");
  const uf = texto(dados, "uf")?.toUpperCase() ?? null;
  const dataNascimentoTexto = texto(dados, "dataNascimento");

  const definicao = chaveCertidao ? CERTIDAO_POR_CHAVE[chaveCertidao] : null;
  if (!definicao) return { erro: "Escolha o tipo de certidão." };
  if (!documento) return { erro: "Informe o CPF ou CNPJ." };
  if (!nome) return { erro: "Informe o nome." };

  if (!temEmissaoAutomatica(chaveCertidao!, uf)) {
    return {
      erro:
        "Esta certidão não tem emissão automática" +
        (uf ? " neste estado" : "") +
        ". Confira INFOSIMPLES_TOKEN no .env, ou emita pelo link do órgão e envie o arquivo em \"Novo documento\".",
    };
  }

  const emissao = await emitirCertidao({
    chaveCertidao: chaveCertidao!,
    parte: {
      documento,
      nome,
      dataNascimento: dataNascimentoTexto ? new Date(dataNascimentoTexto) : null,
      uf,
    },
  });

  if (!emissao.ok) return { erro: `Não foi possível emitir: ${emissao.erro}` };

  const { certidao } = emissao;
  const comprovanteUrl = certidao.comprovantes[0] ?? null;

  let arquivo: Buffer | null = null;
  let arquivoTipo: string | null = null;
  let hashSha256: string | null = null;
  let nomeArquivo: string | null = null;

  if (comprovanteUrl) {
    try {
      const baixado = await fetch(comprovanteUrl, { signal: AbortSignal.timeout(60_000) });
      if (baixado.ok) {
        const conteudo = Buffer.from(await baixado.arrayBuffer());
        if (conteudo.length > 0 && conteudo.length <= 15 * 1024 * 1024) {
          arquivo = conteudo;
          arquivoTipo = baixado.headers.get("content-type")?.split(";")[0] ?? "application/pdf";
          const extensao = arquivoTipo.includes("pdf") ? "pdf" : arquivoTipo.includes("html") ? "html" : "bin";
          nomeArquivo = `${chaveCertidao!.toLowerCase().replace(/_/g, "-")}-${Date.now()}.${extensao}`;
          hashSha256 = crypto.createHash("sha256").update(conteudo).digest("hex");
        }
      }
    } catch (erro) {
      console.error("Comprovante da certidão não pôde ser baixado:", erro);
    }
  }

  // Última versão apresentada do mesmo tipo e do mesmo documento, para comparar.
  const apresentado = await prisma.verificacaoDocumento.findFirst({
    where: { verificacaoContaId: conta.id, documento, tipo: "CERTIDAO", origem: "APRESENTADA" },
    orderBy: { criadoEm: "desc" },
  });

  const divergencia = apresentado
    ? compararResultado(
        { resultado: apresentado.resultado, apontamento: apresentado.apontamento, leituraIa: apresentado.leituraIa },
        { resultado: certidao.resultado, apontamento: certidao.apontamento }
      )
    : null;

  await prisma.verificacaoDocumento.create({
    data: {
      verificacaoContaId: conta.id,
      titulo: definicao.nome,
      tipo: "CERTIDAO",
      origem: "EMITIDA",
      documento,
      nomeArquivo,
      arquivo,
      arquivoTipo,
      hashSha256,
      validaAte: new Date(Date.now() + definicao.validadeDias * 86400000),
      numero: certidao.numero,
      orgaoEmissor: definicao.orgao,
      resultado: certidao.resultado,
      apontamento: certidao.apontamento,
      natureza: certidao.natureza,
      comprovanteUrl,
      dadosConsulta: (certidao.bruto ?? undefined) as never,
      compararComId: apresentado?.id ?? null,
      divergencia,
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
