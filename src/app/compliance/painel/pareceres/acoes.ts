"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEdicaoCompliance } from "@/lib/compliance/sessao";
import { arquivoComConteudo } from "@/lib/arquivo-enviado";
import { gerarMinutaParecer, finalizarParecer, ROTULO_TIPO_PARECER } from "@/lib/compliance/parecer";
import { configuracaoDaSolucao } from "@/lib/planos-solucao";

export type ResultadoAcao = { erro?: string; ok?: boolean };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

const TIPOS = Object.keys(ROTULO_TIPO_PARECER);

/**
 * Teste grátis: cota única de consultas, compartilhada entre empresas,
 * pessoas, processos e pareceres — é a mesma conta, a mesma assinatura.
 */
async function testeEsgotado(complianceContaId: string, statusAssinatura: string): Promise<boolean> {
  if (statusAssinatura !== "TESTE") return false;
  const [empresas, pessoas, processos, pareceres] = await Promise.all([
    prisma.complianceAuditoria.count({ where: { complianceContaId } }),
    prisma.diligenciaAuditoria.count({ where: { complianceContaId } }),
    prisma.complianceProcessoAnalise.count({ where: { complianceContaId } }),
    prisma.complianceParecer.count({ where: { complianceContaId } }),
  ]);
  const { consultasGratisTeste } = await configuracaoDaSolucao("COMPLIANCE_EMPRESA");
  return empresas + pessoas + processos + pareceres >= consultasGratisTeste;
}

/**
 * Cria o pedido de parecer e gera a minuta automaticamente, na hora — mesmo
 * padrão de empresas, pessoas e processos: a análise acontece ao salvar.
 */
export async function salvarParecer(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  const tipo = texto(dados, "tipo") ?? "";
  const tema = texto(dados, "tema") ?? "";

  if (!TIPOS.includes(tipo)) return { erro: "Escolha o tipo do material a analisar." };
  if (tema.length < 10) return { erro: "Descreva o tema — o que você quer que o parecer responda ou analise (mínimo uma frase)." };

  if (await testeEsgotado(conta.id, conta.statusAssinatura)) {
    return {
      erro: `Seu teste grátis já usou as ${(await configuracaoDaSolucao("COMPLIANCE_EMPRESA")).consultasGratisTeste} consultas incluídas (empresas, pessoas, processos e pareceres somados). Assine um plano para continuar.`,
    };
  }

  let complianceProcessoId: string | null = null;
  let arquivo: Buffer | null = null;
  let arquivoTipo: string | null = null;
  let nomeArquivo: string | null = null;

  if (tipo === "PROCESSO") {
    complianceProcessoId = texto(dados, "complianceProcessoId");
    if (!complianceProcessoId) return { erro: "Escolha o processo já cadastrado que o parecer vai analisar." };

    const processo = await prisma.complianceProcesso.findFirst({
      where: { id: complianceProcessoId, complianceContaId: conta.id },
      select: { id: true },
    });
    if (!processo) return { erro: "Processo não encontrado." };
  } else {
    const enviado = dados.get("arquivo");
    if (!arquivoComConteudo(enviado)) return { erro: "Anexe o arquivo a ser analisado." };
    if (enviado.size > 15 * 1024 * 1024) return { erro: "Arquivo maior que 15 MB." };

    const tipoMime = enviado.type || "";
    if (tipoMime !== "application/pdf" && !tipoMime.startsWith("image/")) {
      return { erro: "Por enquanto só é possível anexar PDF ou imagem — arquivo .docx ainda não é lido automaticamente." };
    }

    arquivo = Buffer.from(await enviado.arrayBuffer());
    arquivoTipo = tipoMime;
    nomeArquivo = enviado.name || null;
  }

  const pedido = await prisma.complianceParecer.create({
    data: {
      complianceContaId: conta.id,
      tipo,
      tema,
      complianceProcessoId,
      arquivo,
      arquivoTipo,
      arquivoNome: nomeArquivo,
      solicitadoPorId: usuario.id,
    },
  });

  try {
    await gerarMinutaParecer(pedido.id);
  } catch (erro) {
    console.error("Geração automática da minuta falhou:", erro);
  }

  revalidatePath("/compliance/painel/pareceres");
  redirect(`/compliance/painel/pareceres/${pedido.id}`);
}

export async function gerarMinutaNovamente(id: string): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoCompliance();

  const pedido = await prisma.complianceParecer.findFirst({ where: { id, complianceContaId: conta.id } });
  if (!pedido) return { erro: "Pedido de parecer não encontrado." };

  if (await testeEsgotado(conta.id, conta.statusAssinatura)) {
    return {
      erro: `Seu teste grátis já usou as ${(await configuracaoDaSolucao("COMPLIANCE_EMPRESA")).consultasGratisTeste} consultas incluídas (empresas, pessoas, processos e pareceres somados). Assine um plano para continuar.`,
    };
  }

  const r = await gerarMinutaParecer(id);
  revalidatePath(`/compliance/painel/pareceres/${id}`);
  return r.ok ? { ok: true } : { erro: r.erro };
}

export async function finalizarParecerAcao(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  const pedidoId = texto(dados, "pedidoId");
  const textoFinal = texto(dados, "textoFinal") ?? "";
  const assinar = dados.get("assinar") === "on";

  if (!pedidoId) return { erro: "Pedido de parecer não informado." };
  if (textoFinal.length < 20) return { erro: "O texto do parecer está vazio demais para finalizar." };

  const responsavelNome = texto(dados, "responsavelNome") || usuario.nome;
  const responsavelCargo = texto(dados, "responsavelCargo") || "Responsável pela análise";
  const responsavelRegistro = texto(dados, "responsavelRegistro");

  if (assinar && !responsavelNome) {
    return { erro: "Informe o nome de quem assina para finalizar como assinado." };
  }

  const r = await finalizarParecer({
    pedidoId,
    complianceContaId: conta.id,
    textoFinal,
    assinar,
    responsavel: assinar ? { nome: responsavelNome, cargo: responsavelCargo, registro: responsavelRegistro } : null,
  });

  revalidatePath(`/compliance/painel/pareceres/${pedidoId}`);
  return r.ok ? { ok: true } : { erro: r.erro };
}
