/**
 * Pareceres — orquestração e gravação da quarta tela da solução Compliance e
 * Due Diligence, adicionada em 14/09/2026.
 *
 * Contrato, documento, parecer já existente ou um processo já cadastrado (na
 * aba Processos), sobre qualquer tema pedido em texto livre. O sistema gera
 * uma MINUTA primeiro (rascunho da IA, via `perguntarTexto` — texto corrido,
 * não JSON) e só vira PARECER quando o usuário finaliza, com opção de
 * registrar autoria (nome/cargo/registro) — um "carimbo" de quem assinou,
 * sem certificado digital de verdade, com hash do texto para provar que não
 * foi alterado depois.
 */
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { perguntarTexto, iaConfigurada, type BlocoConteudo } from "@/lib/ia/claude";
import { gerarDocumentoParecer } from "@/lib/documentos/parecer";
import { formatarNumeroProcessoCnj } from "@/lib/validacao";
import type { RegularidadeProcesso } from "@/lib/auditoria/processo";

export const ROTULO_TIPO_PARECER: Record<string, string> = {
  CONTRATO: "Contrato",
  DOCUMENTO: "Documento",
  PARECER: "Parecer existente",
  PROCESSO: "Processo",
};

const INSTRUCAO = `Você é um analista que redige pareceres para uma plataforma de compliance e due diligence no mercado de ativos financeiros e créditos judiciais (precatórios).

Vai receber um material — um contrato, um documento, um parecer já existente, ou a movimentação de um processo judicial — e um TEMA: o que especificamente a pessoa quer que você analise ou responda sobre esse material.

Escreva um parecer técnico, em português, em prosa corrida (parágrafos separados por linha em branco, sem markdown, sem listas com marcadores — texto corrido como um parecer de verdade), respondendo diretamente ao tema pedido, fundamentado no que está no material recebido.

REGRAS QUE NÃO PODEM SER QUEBRADAS:
1. Baseie-se SOMENTE no que está no material recebido. Nunca invente cláusula, valor, data, nome ou fato que não esteja lá.
2. Quando o material não tiver informação suficiente para responder a uma parte do tema, diga isso explicitamente — nunca preencha a lacuna com suposição.
3. Aponte riscos e pontos de atenção quando existirem, mas não dê conselho definitivo além do que os dados sustentam.
4. Isto é um RASCUNHO (minuta): escreva como um parecer completo, mas a pessoa que pediu vai revisar antes de assinar — nada aqui é definitivo até ela confirmar.

Responda só com o texto do parecer — sem título, sem "Parecer:", direto ao conteúdo, em parágrafos.`;

function blocoDoArquivo(bytes: Buffer, tipo: string): BlocoConteudo | null {
  if (tipo === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") } };
  }
  if (tipo.startsWith("image/")) {
    return { type: "image", source: { type: "base64", media_type: tipo, data: bytes.toString("base64") } };
  }
  return null;
}

async function marcarErro(pedidoId: string, erro: string): Promise<void> {
  await prisma.complianceParecer.update({ where: { id: pedidoId }, data: { situacao: "ERRO", erro } });
}

/**
 * Gera a minuta a partir do material do pedido — arquivo anexado (contrato,
 * documento, parecer) ou, para tipo PROCESSO, a leitura de regularidade já
 * apurada na aba Processos.
 */
export async function gerarMinutaParecer(pedidoId: string): Promise<{ ok: boolean; erro?: string }> {
  const pedido = await prisma.complianceParecer.findUnique({ where: { id: pedidoId } });
  if (!pedido) return { ok: false, erro: "Pedido de parecer não encontrado." };

  if (!iaConfigurada()) {
    const erro = "Inteligência artificial não configurada (ANTHROPIC_API_KEY).";
    await marcarErro(pedidoId, erro);
    return { ok: false, erro };
  }

  const blocos: BlocoConteudo[] = [];

  if (pedido.tipo === "PROCESSO") {
    if (!pedido.complianceProcessoId) {
      const erro = "Processo não vinculado a este pedido.";
      await marcarErro(pedidoId, erro);
      return { ok: false, erro };
    }

    const processo = await prisma.complianceProcesso.findUnique({
      where: { id: pedido.complianceProcessoId },
      include: { analises: { orderBy: { criadoEm: "desc" }, take: 1 } },
    });
    if (!processo) {
      const erro = "Processo vinculado não foi encontrado.";
      await marcarErro(pedidoId, erro);
      return { ok: false, erro };
    }

    const leitura = (processo.analises[0]?.leitura as unknown as RegularidadeProcesso | null) ?? null;
    const material = leitura
      ? JSON.stringify({ numeroProcesso: formatarNumeroProcessoCnj(processo.numeroProcesso), ...leitura }, null, 2)
      : `Processo ${formatarNumeroProcessoCnj(processo.numeroProcesso)} — ainda sem análise de regularidade processual concluída na aba Processos.`;

    blocos.push({ type: "text", text: `MATERIAL (análise de regularidade processual já apurada):\n${material}` });
  } else {
    if (!pedido.arquivo || !pedido.arquivoTipo) {
      const erro = "Arquivo não anexado a este pedido.";
      await marcarErro(pedidoId, erro);
      return { ok: false, erro };
    }

    const bloco = blocoDoArquivo(Buffer.from(pedido.arquivo), pedido.arquivoTipo);
    if (!bloco) {
      const erro = "Tipo de arquivo não suportado para leitura por IA (aceita PDF ou imagem).";
      await marcarErro(pedidoId, erro);
      return { ok: false, erro };
    }

    blocos.push({ type: "text", text: "MATERIAL (anexado pelo usuário):" }, bloco);
  }

  blocos.push({ type: "text", text: `\nTEMA SOLICITADO: ${pedido.tema}` });

  const resposta = await perguntarTexto({
    instrucao: INSTRUCAO,
    conteudo: blocos,
    maxTokens: 6000,
    contexto: {
      solucao: "COMPLIANCE_EMPRESA",
      contaId: pedido.complianceContaId,
      referencia: `Parecer — ${ROTULO_TIPO_PARECER[pedido.tipo] ?? pedido.tipo} — ${pedido.tema.slice(0, 60)}`,
    },
  });

  if (!resposta.ok) {
    await marcarErro(pedidoId, resposta.erro);
    return { ok: false, erro: resposta.erro };
  }

  await prisma.complianceParecer.update({
    where: { id: pedidoId },
    data: { situacao: "MINUTA_PRONTA", minuta: resposta.texto, minutaGeradaEm: new Date(), erro: null },
  });

  return { ok: true };
}

/**
 * Finaliza o parecer: grava o texto (a minuta, possivelmente editada pelo
 * usuário) como definitivo, tira o hash de integridade, gera o .docx e,
 * quando pedido, registra a autoria de quem assinou.
 */
export async function finalizarParecer(params: {
  pedidoId: string;
  complianceContaId: string;
  textoFinal: string;
  assinar: boolean;
  responsavel?: { nome: string; cargo: string; registro?: string | null } | null;
}): Promise<{ ok: boolean; erro?: string }> {
  const pedido = await prisma.complianceParecer.findFirst({
    where: { id: params.pedidoId, complianceContaId: params.complianceContaId },
  });
  if (!pedido) return { ok: false, erro: "Pedido de parecer não encontrado." };

  const conta = await prisma.complianceConta.findUnique({ where: { id: params.complianceContaId } });
  if (!conta) return { ok: false, erro: "Conta não encontrada." };

  const textoFinal = params.textoFinal.trim();
  if (!textoFinal) return { ok: false, erro: "O texto do parecer não pode ficar vazio." };

  const hashParecerSha256 = crypto.createHash("sha256").update(textoFinal, "utf8").digest("hex");
  const assinatura = params.assinar && params.responsavel ? params.responsavel : null;

  const documento = await gerarDocumentoParecer({
    tipoRotulo: ROTULO_TIPO_PARECER[pedido.tipo] ?? pedido.tipo,
    tema: pedido.tema,
    corpo: textoFinal,
    cidade: conta.enderecoCidade,
    uf: conta.enderecoUf,
    assinatura,
  });

  await prisma.complianceParecer.update({
    where: { id: pedido.id },
    data: {
      situacao: "FINALIZADO",
      parecerFinal: textoFinal,
      finalizadoEm: new Date(),
      hashParecerSha256,
      assinado: Boolean(assinatura),
      assinadoPorNome: assinatura?.nome ?? null,
      assinadoPorCargo: assinatura?.cargo ?? null,
      assinadoPorRegistro: assinatura?.registro ?? null,
      assinadoEm: assinatura ? new Date() : null,
      documentoArquivo: documento.buffer,
      documentoNome: documento.nomeArquivo,
    },
  });

  return { ok: true };
}
