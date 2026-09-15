"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEdicaoLicitacoes } from "@/lib/licitacoes/sessao";
import { somenteAlfanumerico, validarDocumento } from "@/lib/validacao";
import { auditarParticipante, reclassificarParticipante } from "@/lib/licitacoes/auditoria";
import { arquivoComConteudo } from "@/lib/arquivo-enviado";
import { lerEdital } from "@/lib/licitacoes/leitura-edital";
import { DOCUMENTOS_HABILITACAO } from "@/lib/licitacoes/requisitos";
import { lerDocumentoDeHabilitacao, conferirDocumento } from "@/lib/licitacoes/leitura-documento";
import { regrasDoEdital, regraDoDocumento } from "@/lib/licitacoes/regras-documento";
import type { LeituraEdital } from "@/lib/licitacoes/leitura-edital";
import type { ParticipanteCertame } from "@prisma/client";

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

  const criterio = texto(dados, "criterioJulgamento");
  const valorEstimadoTexto = texto(dados, "valorEstimado");

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
      criterioJulgamento: criterio,
      valorEstimado: valorEstimadoTexto ? Number(valorEstimadoTexto.replace(/\./g, "").replace(",", ".")) : null,
      orcamentoSigiloso: dados.get("orcamentoSigiloso") === "on",
      tipoObjeto: texto(dados, "tipoObjeto"),
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

  // Mudaram os requisitos exigidos: a conferência de cada participante contra
  // o edital precisa ser refeita, senão a recomendação fica falando de uma
  // lista que não existe mais.
  if (resultado.ok) {
    const participantes = await prisma.participanteCertame.findMany({
      where: { certameId },
      select: { id: true },
    });
    for (const p of participantes) {
      await reclassificarParticipante(p.id).catch((erro) =>
        console.error("Reclassificação após reler o edital falhou:", erro)
      );
    }
  }

  revalidatePath(`/licitacoes/painel/prefeituras/${certameId}`);
  return resultado.ok ? { ok: true } : { erro: resultado.erro };
}

// ---------------------------------------------------------------------
// Importação em lote de participantes
// ---------------------------------------------------------------------

export type ResultadoImportacao = {
  erro?: string;
  criados?: number;
  repetidos?: number;
  invalidos?: { linha: string; motivo: string }[];
};

/** Acha o CNPJ na linha e trata o resto como nome. */
function analisarLinha(linha: string): { documento: string; nome: string } | { erro: string } {
  const bruto = linha.trim();
  if (!bruto) return { erro: "linha vazia" };

  const achado = bruto.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
  if (!achado) return { erro: "nenhum CNPJ encontrado nesta linha" };

  const documento = somenteAlfanumerico(achado[0]);
  if (!validarDocumento(documento, "PJ")) return { erro: `CNPJ ${achado[0]} não passa na conferência dos dígitos` };

  // O nome é o que sobra depois de tirar o CNPJ e os separadores. O espaço
  // que fica no lugar do número (quando ele vem no meio do nome) é colapsado.
  const nome = bruto
    .replace(achado[0], " ")
    .replace(/^[\s;,|\-–—\t]+|[\s;,|\-–—\t]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { documento, nome: nome || `CNPJ ${achado[0]}` };
}

/**
 * Cria vários participantes de uma vez, a partir de uma lista colada.
 *
 * NÃO audita aqui de propósito: cada auditoria faz várias consultas externas
 * e emite certidão, o que levaria minutos para uma lista grande e estouraria
 * o tempo da requisição. Os participantes entram na hora, marcados como não
 * auditados, e a auditoria roda em seguida, um por vez, com andamento à
 * vista — ver `auditarProximoPendente`.
 */
export async function importarParticipantes(
  _anterior: ResultadoImportacao,
  dados: FormData
): Promise<ResultadoImportacao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const certameId = texto(dados, "certameId");
  const lista = texto(dados, "lista");

  if (!certameId) return { erro: "Certame não informado." };
  if (!lista) return { erro: "Cole a lista de participantes." };

  const certame = await prisma.certame.findFirst({ where: { id: certameId, licitacaoContaId: conta.id } });
  if (!certame) return { erro: "Certame não encontrado." };

  const jaCadastrados = await prisma.participanteCertame.findMany({
    where: { certameId },
    select: { documento: true },
  });
  const existentes = new Set(jaCadastrados.map((p) => p.documento).filter(Boolean));

  const invalidos: { linha: string; motivo: string }[] = [];
  const paraCriar: { documento: string; nome: string }[] = [];
  const vistos = new Set<string>();
  let repetidos = 0;

  for (const linha of lista.split(/\r?\n/)) {
    if (!linha.trim()) continue;

    const r = analisarLinha(linha);
    if ("erro" in r) {
      invalidos.push({ linha: linha.trim(), motivo: r.erro });
      continue;
    }

    // Repetido dentro da própria lista, ou já cadastrado no certame.
    if (vistos.has(r.documento) || existentes.has(r.documento)) {
      repetidos++;
      continue;
    }

    vistos.add(r.documento);
    paraCriar.push(r);
  }

  if (paraCriar.length > 0) {
    await prisma.participanteCertame.createMany({
      data: paraCriar.map((p) => ({ certameId, nome: p.nome, documento: p.documento })),
    });
  }

  revalidatePath(`/licitacoes/painel/prefeituras/${certameId}`);
  return { criados: paraCriar.length, repetidos, invalidos };
}

export type ProgressoAuditoria = { erro?: string; restantes: number; auditado?: string };

/**
 * Audita UM participante ainda não auditado e diz quantos faltam.
 *
 * É chamada em sequência pela tela, um por vez: assim cada requisição termina
 * rápido, o andamento aparece de verdade, e uma falha numa empresa não
 * derruba o lote inteiro.
 */
export async function auditarProximoPendente(certameId: string): Promise<ProgressoAuditoria> {
  const { conta } = await exigirEdicaoLicitacoes();

  const certame = await prisma.certame.findFirst({ where: { id: certameId, licitacaoContaId: conta.id } });
  if (!certame) return { erro: "Certame não encontrado.", restantes: 0 };

  const pendentes = await prisma.participanteCertame.findMany({
    where: { certameId, complianceEm: null, documento: { not: "" } },
    orderBy: { criadoEm: "asc" },
  });

  if (pendentes.length === 0) return { restantes: 0 };

  const participante = pendentes[0];

  try {
    await auditarParticipante({ participante });
  } catch (erro) {
    console.error(`Auditoria em lote falhou para ${participante.nome}:`, erro);
    // Marca como tocado para o lote não travar nesta empresa para sempre. O
    // resultado vazio aparece na tela como "não auditada", e o botão de
    // verificar de novo continua disponível na ficha dela.
    await prisma.participanteCertame.update({
      where: { id: participante.id },
      data: { complianceEm: new Date() },
    });
  }

  revalidatePath(`/licitacoes/painel/prefeituras/${certameId}`);
  return { restantes: pendentes.length - 1, auditado: participante.nome };
}

// ---------------------------------------------------------------------
// Propostas
// ---------------------------------------------------------------------

/** Lança o valor ofertado pelo participante, no critério do certame. */
export async function salvarProposta(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const participanteCertameId = texto(dados, "participanteCertameId");
  const certameId = texto(dados, "certameId");
  const bruto = texto(dados, "propostaValor");

  if (!participanteCertameId || !certameId) return { erro: "Participante não informado." };
  if (!bruto) return { erro: "Informe o valor da proposta." };

  const valor = Number(bruto.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(valor) || valor <= 0) return { erro: "Valor da proposta inválido." };

  const participante = await prisma.participanteCertame.findFirst({
    where: { id: participanteCertameId, certame: { licitacaoContaId: conta.id } },
  });
  if (!participante) return { erro: "Participante não encontrado." };

  await prisma.participanteCertame.update({
    where: { id: participanteCertameId },
    data: {
      propostaValor: valor,
      propostaEm: new Date(),
      // Lançar valor novo reabre a proposta: desclassificação anterior deixa
      // de valer, para não carregar motivo de uma oferta que não existe mais.
      propostaSituacao: "CLASSIFICADA",
      propostaMotivo: null,
    },
  });

  revalidatePath(`/licitacoes/painel/prefeituras/${certameId}`);
  return { ok: true };
}

/**
 * Desclassifica a proposta, por ato da comissão.
 *
 * Fica separado da apuração automática de propósito: o motivo é escrito por
 * quem decide, e prevalece sobre qualquer conferência do sistema.
 */
export async function desclassificarProposta(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const participanteCertameId = texto(dados, "participanteCertameId");
  const certameId = texto(dados, "certameId");
  const motivo = texto(dados, "motivo") ?? "";

  if (!participanteCertameId || !certameId) return { erro: "Participante não informado." };
  if (motivo.length < 20) {
    return { erro: "Escreva o motivo da desclassificação — no mínimo uma frase, que é o que fundamenta o ato." };
  }

  const participante = await prisma.participanteCertame.findFirst({
    where: { id: participanteCertameId, certame: { licitacaoContaId: conta.id } },
  });
  if (!participante) return { erro: "Participante não encontrado." };

  await prisma.participanteCertame.update({
    where: { id: participanteCertameId },
    data: { propostaSituacao: "DESCLASSIFICADA", propostaMotivo: motivo },
  });

  revalidatePath(`/licitacoes/painel/prefeituras/${certameId}`);
  return { ok: true };
}

/** Roda de novo a verificação completa do participante, com consulta às fontes. */
export async function reauditarParticipante(
  participanteCertameId: string,
  certameId: string
): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const participante = await prisma.participanteCertame.findFirst({
    where: { id: participanteCertameId, certame: { licitacaoContaId: conta.id } },
  });
  if (!participante) return { erro: "Participante não encontrado." };
  if (!participante.documento) return { erro: "Participante sem CNPJ — não há o que consultar." };

  try {
    await auditarParticipante({ participante });
  } catch (erro) {
    return { erro: `Verificação não concluída: ${(erro as Error).message}` };
  }

  revalidatePath(`/licitacoes/painel/prefeituras/${certameId}/${participanteCertameId}`);
  return { ok: true };
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

/**
 * Os tipos aceitos são os da taxonomia de habilitação, não uma lista à parte:
 * é assim que o documento apresentado casa com o requisito lido do edital na
 * classificação automática. Lista própria voltaria a divergir na primeira vez
 * que alguém acrescentasse um requisito num lugar só.
 */
const TIPOS_DOCUMENTO_PARTICIPANTE = [...DOCUMENTOS_HABILITACAO.map((d) => d.chave), "OUTRO"];

/**
 * Lê o documento anexado e confere contra a regra do edital.
 *
 * A data de referência da validade é a da sessão do certame, quando houver:
 * é nela que a habilitação é julgada, não no dia em que alguém anexou o
 * arquivo. Sem data de sessão marcada, vale hoje.
 */
async function conferirDocumentoAnexado(params: {
  documentoId: string;
  tipo: string;
  arquivo: Buffer;
  arquivoTipo: string;
  participante: ParticipanteCertame;
  contaId: string;
}): Promise<void> {
  const leitura = await lerDocumentoDeHabilitacao({
    arquivo: params.arquivo,
    arquivoTipo: params.arquivoTipo,
    contexto: {
      solucao: "LICITACOES",
      contaId: params.contaId,
      referencia: `Habilitação — ${params.participante.nome}`,
    },
  });

  if (!leitura.ok) {
    await prisma.documentoParticipante.update({
      where: { id: params.documentoId },
      data: { leituraIaEm: new Date(), leituraIaErro: leitura.erro },
    });
    return;
  }

  const certame = await prisma.certame.findUnique({
    where: { id: params.participante.certameId },
    select: { requisitosExtraidos: true, dataSessao: true },
  });

  const regras = regrasDoEdital((certame?.requisitosExtraidos as unknown as LeituraEdital | null) ?? null);

  const achados = conferirDocumento({
    leitura: leitura.leitura,
    tipoDeclarado: params.tipo,
    regra: regraDoDocumento(regras, params.tipo),
    documentoDoParticipante: params.participante.documento,
    referencia: certame?.dataSessao ?? new Date(),
  });

  await prisma.documentoParticipante.update({
    where: { id: params.documentoId },
    data: {
      leituraIa: leitura.leitura as never,
      leituraIaEm: new Date(),
      leituraIaErro: null,
      conferenciaAutomatica: achados as never,
    },
  });
}

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

  const documento = await prisma.documentoParticipante.create({
    data: {
      participanteCertameId,
      tipo,
      nomeArquivo: arquivo.name,
      arquivo: bytes,
      arquivoTipo: arquivo.type || null,
    },
  });

  // Lê o documento e confere contra a regra que o edital impõe: titularidade,
  // validade e, sendo certidão negativa, se é mesmo negativa.
  await conferirDocumentoAnexado({
    documentoId: documento.id,
    tipo,
    arquivo: bytes,
    arquivoTipo: arquivo.type || "",
    participante,
    contaId: conta.id,
  }).catch((erro) => console.error("Leitura automática do documento falhou:", erro));

  // O documento novo pode fechar uma pendência do edital — a recomendação
  // precisa refletir isso na hora, não na próxima auditoria.
  await reclassificarParticipante(participanteCertameId).catch((erro) =>
    console.error("Reclassificação após anexar documento falhou:", erro)
  );

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

  // Documento que diverge da fonte é impedimento — a recomendação muda na hora.
  await reclassificarParticipante(participanteCertameId).catch((erro) =>
    console.error("Reclassificação após conferir autenticidade falhou:", erro)
  );

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
