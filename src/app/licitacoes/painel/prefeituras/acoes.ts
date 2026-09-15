"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEdicaoLicitacoes } from "@/lib/licitacoes/sessao";
import { somenteAlfanumerico, validarDocumento } from "@/lib/validacao";
import { auditarParticipante } from "@/lib/licitacoes/auditoria";
import { arquivoComConteudo } from "@/lib/arquivo-enviado";
import { lerEdital } from "@/lib/licitacoes/leitura-edital";

export type ResultadoAcao = { erro?: string; ok?: boolean };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

/**
 * Cria o certame — a visão da prefeitura sobre uma licitação que ela conduz.
 *
 * Não referencia `EditalInteresse` nem `LicitanteEmpresa`: aqueles são o
 * cadastro da FRENTE DO LICITANTE, e as duas frentes não se comunicam, mesmo
 * quando o mesmo edital do mundo real aparece nas duas.
 */
export async function salvarCertame(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const orgaoLicitante = texto(dados, "orgaoLicitante");
  const modalidade = texto(dados, "modalidade");
  const numeroCertame = texto(dados, "numeroCertame");
  const objeto = texto(dados, "objeto");
  const dataSessao = texto(dados, "dataSessao");
  const arquivo = dados.get("arquivoEdital");

  if (!orgaoLicitante || !modalidade || !numeroCertame) {
    return { erro: "Informe o órgão, a modalidade e o número do certame." };
  }

  let arquivoEditalNome: string | null = null;
  let arquivoEditalTipo: string | null = null;
  let bytes: Buffer | null = null;
  if (arquivoComConteudo(arquivo)) {
    if (arquivo.size > 20 * 1024 * 1024) return { erro: "Edital maior que 20 MB." };
    arquivoEditalNome = arquivo.name;
    arquivoEditalTipo = arquivo.type || null;
    bytes = Buffer.from(await arquivo.arrayBuffer());
  }

  const certame = await prisma.certame.create({
    data: {
      licitacaoContaId: conta.id,
      orgaoLicitante,
      modalidade,
      numeroCertame,
      objeto,
      arquivoEditalNome,
      arquivoEdital: bytes,
      arquivoEditalTipo,
      dataSessao: dataSessao ? new Date(dataSessao) : null,
    },
  });

  // Leitura automática dos requisitos de habilitação — só quando há PDF/imagem
  // para ler. Nunca sobrescreve os campos que o usuário acabou de digitar.
  if (bytes && arquivoEditalTipo) {
    try {
      const resultado = await lerEdital({
        arquivo: bytes,
        arquivoTipo: arquivoEditalTipo,
        contexto: { solucao: "LICITACOES", contaId: conta.id, referencia: `Edital — ${orgaoLicitante} ${numeroCertame}` },
      });
      await prisma.certame.update({
        where: { id: certame.id },
        data: resultado.ok
          ? { requisitosExtraidos: resultado.leitura as never, leituraIaEm: new Date(), leituraIaErro: null }
          : { leituraIaEm: new Date(), leituraIaErro: resultado.erro },
      });
    } catch (erro) {
      console.error("Leitura automática do edital falhou:", erro);
    }
  }

  revalidatePath("/licitacoes/painel/prefeituras");
  redirect(`/licitacoes/painel/prefeituras/${certame.id}`);
}

/** Roda de novo a leitura automática — para quando o edital foi cadastrado antes desta funcionalidade, ou a leitura falhou. */
export async function relerCertame(certameId: string): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const certame = await prisma.certame.findFirst({ where: { id: certameId, licitacaoContaId: conta.id } });
  if (!certame) return { erro: "Certame não encontrado." };
  if (!certame.arquivoEdital) return { erro: "Nenhum arquivo de edital anexado para ler." };

  const resultado = await lerEdital({
    arquivo: Buffer.from(certame.arquivoEdital),
    arquivoTipo: certame.arquivoEditalTipo || "application/pdf",
    contexto: { solucao: "LICITACOES", contaId: conta.id, referencia: `Edital — ${certame.orgaoLicitante} ${certame.numeroCertame}` },
  });

  await prisma.certame.update({
    where: { id: certameId },
    data: resultado.ok
      ? { requisitosExtraidos: resultado.leitura as never, leituraIaEm: new Date(), leituraIaErro: null }
      : { leituraIaEm: new Date(), leituraIaErro: resultado.erro },
  });

  revalidatePath(`/licitacoes/painel/prefeituras/${certameId}`);
  return resultado.ok ? { ok: true } : { erro: resultado.erro };
}

export async function salvarParticipante(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const certameId = texto(dados, "certameId");
  const nome = texto(dados, "nome");
  const documento = somenteAlfanumerico(texto(dados, "documento") ?? "");

  if (!certameId) return { erro: "Certame não informado." };
  if (!nome) return { erro: "Informe o nome ou a razão social do participante." };
  if (documento && !validarDocumento(documento, "PJ")) return { erro: "CNPJ inválido — confira os números." };

  const certame = await prisma.certame.findFirst({ where: { id: certameId, licitacaoContaId: conta.id } });
  if (!certame) return { erro: "Certame não encontrado." };

  const participante = await prisma.participanteCertame.create({
    data: { certameId, nome, documento: documento || "" },
  });

  // A auditoria automática aqui é insumo para a comissão, não uma trava — a
  // decisão de qualificar ou inabilitar continua sendo sempre humana.
  if (documento) {
    try {
      await auditarParticipante({ participante });
    } catch (erro) {
      console.error("Auditoria automática do participante falhou:", erro);
    }
  }

  revalidatePath(`/licitacoes/painel/prefeituras/${certameId}`);
  return { ok: true };
}

const TIPOS_DOCUMENTO_PARTICIPANTE = [
  "CONTRATO_SOCIAL",
  "CERTIDAO_TRIBUTOS_FEDERAIS",
  "CERTIDAO_FGTS",
  "CNDT",
  "CERTIDAO_FALENCIA_CONCORDATA",
  "DECLARACAO_NAO_EMPREGA_MENOR",
  "OUTRO",
];

export async function anexarDocumentoParticipante(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const participanteCertameId = texto(dados, "participanteCertameId");
  const certameId = texto(dados, "certameId");
  const tipo = texto(dados, "tipo") ?? "OUTRO";
  const arquivo = dados.get("arquivo");

  if (!participanteCertameId || !certameId) return { erro: "Participante não informado." };
  if (!TIPOS_DOCUMENTO_PARTICIPANTE.includes(tipo)) return { erro: "Tipo de documento desconhecido." };
  if (!arquivoComConteudo(arquivo)) return { erro: "Selecione um arquivo." };
  if (arquivo.size > 10 * 1024 * 1024) return { erro: "Arquivo maior que 10 MB." };

  const participante = await prisma.participanteCertame.findFirst({
    where: { id: participanteCertameId, certame: { licitacaoContaId: conta.id } },
  });
  if (!participante) return { erro: "Participante não encontrado." };

  const bytes = Buffer.from(await arquivo.arrayBuffer());

  await prisma.documentoParticipante.create({
    data: {
      participanteCertameId,
      tipo,
      nomeArquivo: arquivo.name,
      arquivo: bytes,
      arquivoTipo: arquivo.type || null,
    },
  });

  revalidatePath(`/licitacoes/painel/prefeituras/${certameId}/${participanteCertameId}`);
  return { ok: true };
}

/**
 * Marca se o documento apresentado confere com o que o órgão emissor
 * responde hoje. É comparação simples de resultado, feita pelo analista —
 * não há reemissão automática embutida aqui ainda.
 */
export async function registrarAutenticidade(
  documentoId: string,
  resultado: "CONFERE" | "DIVERGE" | "NAO_VERIFICAVEL",
  certameId: string,
  participanteCertameId: string
): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const documento = await prisma.documentoParticipante.findFirst({
    where: { id: documentoId, participanteCertame: { certame: { licitacaoContaId: conta.id } } },
  });
  if (!documento) return { erro: "Documento não encontrado." };

  await prisma.documentoParticipante.update({
    where: { id: documentoId },
    data: { autenticidadeConferida: true, autenticidadeResultado: resultado },
  });

  revalidatePath(`/licitacoes/painel/prefeituras/${certameId}/${participanteCertameId}`);
  return { ok: true };
}

/**
 * Registra a validação da assinatura de um documento.
 *
 * Assinatura digital tem certificado verificável na fonte — o campo
 * `certificadoValido` reflete uma checagem que pode vir a ser automática.
 * Assinatura manuscrita não tem base pública de comparação automática
 * confiável: o resultado aqui é sempre o que o analista concluiu olhando as
 * duas assinaturas lado a lado, nunca um veredito gerado pelo sistema.
 */
export async function registrarValidacaoAssinatura(
  _anterior: ResultadoAcao,
  dados: FormData
): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoLicitacoes();

  const documentoParticipanteId = texto(dados, "documentoParticipanteId");
  const certameId = texto(dados, "certameId");
  const participanteCertameId = texto(dados, "participanteCertameId");
  const tipo = texto(dados, "tipo") === "DIGITAL" ? "DIGITAL" : "MANUSCRITA";
  const resultado = texto(dados, "resultado") ?? "PENDENTE";

  if (!documentoParticipanteId) return { erro: "Documento não informado." };

  const documento = await prisma.documentoParticipante.findFirst({
    where: { id: documentoParticipanteId, participanteCertame: { certame: { licitacaoContaId: conta.id } } },
  });
  if (!documento) return { erro: "Documento não encontrado." };

  const dadosComuns = {
    tipo,
    resultado,
    validadoEm: new Date(),
  };

  const dadosEspecificos =
    tipo === "DIGITAL"
      ? {
          provedor: texto(dados, "provedor"),
          certificadoValido: dados.get("certificadoValido") === "on",
          identificadorValidacao: texto(dados, "identificadorValidacao"),
        }
      : {
          conferenciaVisualFeitaPor: usuario.nome,
          observacaoAnalista: texto(dados, "observacaoAnalista"),
        };

  await prisma.validacaoAssinatura.upsert({
    where: { documentoParticipanteId },
    create: { documentoParticipanteId, ...dadosComuns, ...dadosEspecificos },
    update: { ...dadosComuns, ...dadosEspecificos },
  });

  revalidatePath(`/licitacoes/painel/prefeituras/${certameId}/${participanteCertameId}`);
  return { ok: true };
}

export async function salvarParecer(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const participanteCertameId = texto(dados, "participanteCertameId");
  const certameId = texto(dados, "certameId");
  const situacao = texto(dados, "situacao") === "QUALIFICADO" ? "QUALIFICADO" : "INABILITADO";
  const motivo = texto(dados, "motivo");

  if (!participanteCertameId) return { erro: "Participante não informado." };

  const participante = await prisma.participanteCertame.findFirst({
    where: { id: participanteCertameId, certame: { licitacaoContaId: conta.id } },
  });
  if (!participante) return { erro: "Participante não encontrado." };

  await prisma.participanteCertame.update({
    where: { id: participanteCertameId },
    data: { situacao, parecer: { motivo, decididoEm: new Date().toISOString() } as never },
  });

  revalidatePath(`/licitacoes/painel/prefeituras/${certameId}/${participanteCertameId}`);
  revalidatePath(`/licitacoes/painel/prefeituras/${certameId}`);
  return { ok: true };
}
