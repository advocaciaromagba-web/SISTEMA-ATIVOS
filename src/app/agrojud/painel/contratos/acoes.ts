"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEdicaoAgro } from "@/lib/agro/sessao";
import { CONSULTAS_GRATIS_TESTE } from "@/lib/planos";
import { lerContratoComIa, type RascunhoContrato } from "@/lib/agro/leitura-contrato";
import { analisarEnquadramentoCreditoRural, type FatosCreditoRural } from "@/lib/agro/credito-rural";
import { analisarEnquadramentoMP1376, type FatosContrato } from "@/lib/agro/mp1376";
import { analisarAlongamento, type FatosAlongamento, type HipoteseMcr } from "@/lib/agro/alongamento";

export type ResultadoAcao = { erro?: string; ok?: boolean };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;
const numero = (dados: FormData, chave: string) => {
  const v = texto(dados, chave);
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const inteiro = (dados: FormData, chave: string) => {
  const n = numero(dados, chave);
  return n === null ? null : Math.trunc(n);
};
const booleano = (dados: FormData, chave: string) => {
  const v = dados.get(chave)?.toString();
  if (v === "sim") return true;
  if (v === "nao") return false;
  return null;
};
const data = (dados: FormData, chave: string) => {
  const v = texto(dados, chave);
  return v ? new Date(v) : null;
};
const listaTexto = (dados: FormData, chave: string): string[] => {
  const v = texto(dados, chave);
  if (!v) return [];
  return v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
};

/** Teste grátis: só a cota de análises definida em `planos.ts`. */
async function testeEsgotado(agroContaId: string, statusAssinatura: string): Promise<boolean> {
  if (statusAssinatura !== "TESTE") return false;
  const total = await prisma.agroContrato.count({ where: { agroContaId } });
  return total >= CONSULTAS_GRATIS_TESTE;
}

/**
 * Pede à IA um rascunho dos fatos do contrato — nada aqui é salvo. Quem
 * chama decide se aceita, edita ou ignora cada campo antes de enviar o
 * formulário de verdade.
 */
export async function sugerirLeituraContrato(
  dados: FormData
): Promise<{ ok: true; dados: RascunhoContrato } | { ok: false; erro: string }> {
  const { conta } = await exigirEdicaoAgro();

  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: "Selecione um arquivo primeiro." };
  if (arquivo.size > 15 * 1024 * 1024) return { ok: false, erro: "Arquivo maior que 15 MB." };

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const { dados: rascunho, erro } = await lerContratoComIa(bytes, arquivo.type || null, conta.id);

  if (!rascunho) return { ok: false, erro: erro ?? "A IA não conseguiu ler o arquivo." };
  return { ok: true, dados: rascunho };
}

export async function criarEAnalisarContrato(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoAgro();

  if (await testeEsgotado(conta.id, conta.statusAssinatura)) {
    return { erro: `Seu teste grátis já usou as ${CONSULTAS_GRATIS_TESTE} análises incluídas. Assine um plano para continuar.` };
  }

  const titulo = texto(dados, "titulo");
  if (!titulo) return { erro: "Dê um título para identificar este contrato." };

  let arquivoBytes: Buffer | null = null;
  let arquivoTipo: string | null = null;
  let nomeArquivo: string | null = null;
  let hashSha256: string | null = null;
  const arquivo = dados.get("arquivo");
  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > 15 * 1024 * 1024) return { erro: "Arquivo maior que 15 MB." };
    arquivoBytes = Buffer.from(await arquivo.arrayBuffer());
    arquivoTipo = arquivo.type || null;
    nomeArquivo = arquivo.name;
    hashSha256 = crypto.createHash("sha256").update(arquivoBytes).digest("hex");
  }

  const categoriaOperacao = texto(dados, "categoriaOperacao") as FatosContrato["categoriaOperacao"];
  const categoriaBeneficiario = texto(dados, "categoriaBeneficiario") as FatosContrato["categoriaBeneficiario"];
  const causaPerda = texto(dados, "causaPerda") as FatosContrato["causaPerda"];
  const situacaoAdimplencia = texto(dados, "situacaoAdimplencia") as FatosContrato["situacaoAdimplenciaNaContratacaoNovaLinha"];

  const fatosCreditoRural: FatosCreditoRural = {
    categoriaOperacao,
    mutuarioEProdutorOuCooperativa: booleano(dados, "mutuarioEProdutorOuCooperativa"),
    finalidadeERural: booleano(dados, "finalidadeERural"),
    fonteRecursos: texto(dados, "fonteRecursos"),
  };
  const resultadoCreditoRural = analisarEnquadramentoCreditoRural(fatosCreditoRural);

  const fatosMp1376: FatosContrato = {
    categoriaOperacao,
    dataContratacaoOriginal: data(dados, "dataContratacao"),
    foiRenegociadoOuProrrogado: booleano(dados, "foiRenegociadoOuProrrogado"),
    dataRenegociacaoOuProrrogacao: data(dados, "dataRenegociacaoOuProrrogacao"),
    situacaoAdimplenciaNaContratacaoNovaLinha: situacaoAdimplencia,
    dataInicioInadimplencia: data(dados, "dataInicioInadimplencia"),
    permaneceInadimplenteEm31Mai2026: booleano(dados, "permaneceInadimplenteEm31Mai2026"),
    categoriaBeneficiario,
    valorOperacao: numero(dados, "valorOperacao"),
    numeroSafrasComPerda: inteiro(dados, "numeroSafrasComPerda"),
    percentualReducaoRenda: numero(dados, "percentualReducaoRenda"),
    causaPerda,
    temLaudoTecnico: booleano(dados, "temLaudoTecnico"),
    origemFundoSocial: booleano(dados, "origemFundoSocial"),
    origemMP1314_2025: booleano(dados, "origemMP1314_2025"),
    encaminhadoDividaAtivaUniao: booleano(dados, "encaminhadoDividaAtivaUniao"),
  };
  const resultadoMp1376 = analisarEnquadramentoMP1376(fatosMp1376);

  const fatosAlongamento: FatosAlongamento = {
    dataContratacao: data(dados, "dataContratacao"),
    dataVencimento: data(dados, "dataVencimento"),
    dataPedidoAlongamento: data(dados, "dataPedidoAlongamento"),
    hipotesesMcr: listaTexto(dados, "hipotesesMcr") as HipoteseMcr[],
    temLaudoTecnico: booleano(dados, "temLaudoTecnico"),
    laudoUnilateral: booleano(dados, "laudoUnilateral"),
    bancoConvidadoParaLaudo: booleano(dados, "bancoConvidadoParaLaudo"),
    houvePedidoAdministrativo: booleano(dados, "houvePedidoAdministrativo"),
    respostaBanco: texto(dados, "respostaBanco") as FatosAlongamento["respostaBanco"],
    recusaFundamentadaPorEscrito: booleano(dados, "recusaFundamentadaPorEscrito"),
    categoriaBeneficiario,
  };
  const resultadoAlongamento = analisarAlongamento(fatosAlongamento);

  const avalistasTexto = texto(dados, "avalistasJson");
  let avalistas: unknown = undefined;
  if (avalistasTexto) {
    try {
      avalistas = JSON.parse(avalistasTexto);
    } catch {
      avalistas = undefined;
    }
  }

  const contrato = await prisma.agroContrato.create({
    data: {
      agroContaId: conta.id,
      titulo,
      mutuarioNome: texto(dados, "mutuarioNome"),
      mutuarioDocumento: texto(dados, "mutuarioDocumento"),
      instituicaoFinanceira: texto(dados, "instituicaoFinanceira"),
      numeroContrato: texto(dados, "numeroContrato"),
      dataContratacao: data(dados, "dataContratacao"),

      categoriaOperacao,
      fonteRecursos: texto(dados, "fonteRecursos"),
      enquadraCreditoRural: resultadoCreditoRural.enquadraComoCreditoRural === "INDETERMINADO" ? null : resultadoCreditoRural.enquadraComoCreditoRural,
      justificativaEnquadramento: resultadoCreditoRural.checklist.map((i) => `${i.requisito}: ${i.observacao}`).join(" | "),

      categoriaBeneficiario,
      valorOperacao: numero(dados, "valorOperacao"),
      situacaoAdimplencia,
      dataInicioInadimplencia: data(dados, "dataInicioInadimplencia"),
      foiRenegociadoOuProrrogado: booleano(dados, "foiRenegociadoOuProrrogado"),
      dataRenegociacaoOuProrrogacao: data(dados, "dataRenegociacaoOuProrrogacao"),

      numeroSafrasComPerda: inteiro(dados, "numeroSafrasComPerda"),
      anosSafrasComPerda: (listaTexto(dados, "anosSafrasComPerda") as unknown) as never,
      percentualReducaoRenda: numero(dados, "percentualReducaoRenda"),
      causaPerda,
      eventosClimaticos: (listaTexto(dados, "eventosClimaticos") as unknown) as never,
      temLaudoTecnico: booleano(dados, "temLaudoTecnico"),
      profissionalHabilitadoNome: texto(dados, "profissionalHabilitadoNome"),
      profissionalHabilitadoRegistro: texto(dados, "profissionalHabilitadoRegistro"),

      origemFundoSocial: booleano(dados, "origemFundoSocial") ?? false,
      origemMP1314_2025: booleano(dados, "origemMP1314_2025") ?? false,
      encaminhadoDividaAtivaUniao: booleano(dados, "encaminhadoDividaAtivaUniao") ?? false,

      taxaJurosContratual: numero(dados, "taxaJurosContratual"),
      indexador: texto(dados, "indexador"),
      encargosMoratorios: texto(dados, "encargosMoratorios"),

      tiposGarantia: (listaTexto(dados, "tiposGarantia") as unknown) as never,
      garantiasDescricao: texto(dados, "garantiasDescricao"),
      valorGarantia: numero(dados, "valorGarantia"),
      avalistas: (avalistas as never) ?? undefined,

      temSeguroRural: booleano(dados, "temSeguroRural"),
      seguradora: texto(dados, "seguradora"),
      apoliceNumero: texto(dados, "apoliceNumero"),
      coberturas: (listaTexto(dados, "coberturas") as unknown) as never,
      vigenciaInicio: data(dados, "vigenciaInicio"),
      vigenciaFim: data(dados, "vigenciaFim"),
      temProagro: booleano(dados, "temProagro"),
      indenizacaoRecebida: numero(dados, "indenizacaoRecebida"),

      riscosIdentificados: (listaTexto(dados, "riscosIdentificados") as unknown) as never,
      desequilibrioContratual: texto(dados, "desequilibrioContratual"),

      nomeArquivo,
      arquivo: arquivoBytes,
      arquivoTipo,
      hashSha256,

      resultadoMp1376: (resultadoMp1376 as unknown) as never,
      situacao: "ANALISADO",
      analisadoEm: new Date(),

      dataVencimento: data(dados, "dataVencimento"),
      dataPedidoAlongamento: data(dados, "dataPedidoAlongamento"),
      hipotesesMcr: (listaTexto(dados, "hipotesesMcr") as unknown) as never,
      laudoUnilateral: booleano(dados, "laudoUnilateral"),
      bancoConvidadoParaLaudo: booleano(dados, "bancoConvidadoParaLaudo"),
      houvePedidoAdministrativo: booleano(dados, "houvePedidoAdministrativo"),
      respostaBanco: texto(dados, "respostaBanco"),
      recusaFundamentadaPorEscrito: booleano(dados, "recusaFundamentadaPorEscrito"),
      resultadoAlongamento: (resultadoAlongamento as unknown) as never,

      advogadoNome: texto(dados, "advogadoNome"),
      advogadoOab: texto(dados, "advogadoOab"),
      enderecoBancoReu: texto(dados, "enderecoBancoReu"),
      comarcaForo: texto(dados, "comarcaForo"),
      varaForo: texto(dados, "varaForo"),
      valorCausa: numero(dados, "valorCausa"),

      solicitadoPorId: usuario.id,
    },
  });

  revalidatePath("/agrojud/painel/contratos");
  redirect(`/agrojud/painel/contratos/${contrato.id}`);
}

export async function excluirContrato(id: string): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoAgro();

  const contrato = await prisma.agroContrato.findFirst({ where: { id, agroContaId: conta.id } });
  if (!contrato) return { erro: "Contrato não encontrado." };

  await prisma.agroContrato.delete({ where: { id } });
  revalidatePath("/agrojud/painel/contratos");
  return { ok: true };
}
