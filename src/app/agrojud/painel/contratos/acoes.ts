"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEdicaoAgro } from "@/lib/agro/sessao";
import { configuracaoDaSolucao } from "@/lib/planos-solucao";
import { lerContratoComIa, type RascunhoContrato } from "@/lib/agro/leitura-contrato";
import { lerAnexoComIa, type RascunhoAnexo, type TipoAnexo } from "@/lib/agro/leitura-anexo";
import { abrirAlerta } from "@/lib/ia/custo";
import { analisarContrato } from "@/lib/agro/analise";
import type { FatosContrato } from "@/lib/agro/mp1376";
import type { FatosAlongamento, HipoteseMcr } from "@/lib/agro/alongamento";
import { arquivoComConteudo } from "@/lib/arquivo-enviado";
import { gerarPeticaoIaCompleta, type TipoPeticaoIa } from "@/lib/agro/peticao-ia";
import { obterAcompanhamentoMp } from "@/lib/agro/acompanhamento";
import { avisoParaPeca } from "@/lib/agro/vigencia-mp";
import { buscarTaxaMediaBcbRural } from "@/lib/agro/bcb";
import { analisarTaxasEEncargos, type PeriodicidadeCapitalizacao } from "@/lib/agro/taxas";

export type ResultadoAcao = {
  erro?: string;
  ok?: boolean;
  /** Só vem preenchido quando `modoLote=1` — é o gancho que a tela usa para avançar ao próximo arquivo sem navegar. */
  contratoId?: string;
};

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
  // Cota do teste desta solução — definida na administração, sem relação
  // com as outras.
  const { consultasGratisTeste } = await configuracaoDaSolucao("AGROJUD");
  return total >= consultasGratisTeste;
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
  if (!arquivoComConteudo(arquivo)) return { ok: false, erro: "Selecione um arquivo primeiro." };
  if (arquivo.size > 15 * 1024 * 1024) return { ok: false, erro: "Arquivo maior que 15 MB." };

  // Qualquer exceção daqui para baixo vira mensagem na tela, não página de
  // erro. Ação que lança exceção em produção derruba a tela inteira e some
  // com o que a pessoa tinha digitado — e ela nem fica sabendo o que houve.
  // O detalhe técnico não vai para o cliente: vai para os alertas do sistema,
  // onde o administrador enxerga.
  try {
    const bytes = Buffer.from(await arquivo.arrayBuffer());
    const { dados: rascunho, erro } = await lerContratoComIa(bytes, arquivo.type || null, conta.id);

    if (!rascunho) return { ok: false, erro: erro ?? "A IA não conseguiu ler o arquivo." };
    return { ok: true, dados: rascunho };
  } catch (falha) {
    const mensagem = falha instanceof Error ? `${falha.name}: ${falha.message}` : String(falha);

    await abrirAlerta({
      tipo: "IA_FALHANDO",
      gravidade: "ATENCAO",
      titulo: "Falha ao ler documento por IA",
      detalhe:
        `A leitura do arquivo quebrou antes de terminar. Detalhe técnico: ${mensagem.slice(0, 500)}. ` +
        `Arquivo: ${arquivo.type || "tipo desconhecido"}, ${arquivo.size} bytes. Conta: ${conta.id}.`,
    });

    return {
      ok: false,
      erro:
        "Não foi possível ler este arquivo agora. O preenchimento manual continua funcionando, e a falha foi " +
        "registrada para a equipe.",
    };
  }
}

export async function criarEAnalisarContrato(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoAgro();

  if (await testeEsgotado(conta.id, conta.statusAssinatura)) {
    return { erro: `Seu teste grátis já usou as ${(await configuracaoDaSolucao("AGROJUD")).consultasGratisTeste} análises incluídas. Assine um plano para continuar.` };
  }

  const titulo = texto(dados, "titulo");
  if (!titulo) return { erro: "Dê um título para identificar este contrato." };

  let arquivoBytes: Buffer | null = null;
  let arquivoTipo: string | null = null;
  let nomeArquivo: string | null = null;
  let hashSha256: string | null = null;
  const arquivo = dados.get("arquivo");
  if (arquivoComConteudo(arquivo)) {
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

  const { resultadoCreditoRural, resultadoMp1376, resultadoAlongamento } = analisarContrato({
    categoriaOperacao,
    mutuarioEProdutorOuCooperativa: booleano(dados, "mutuarioEProdutorOuCooperativa"),
    finalidadeERural: booleano(dados, "finalidadeERural"),
    fonteRecursos: texto(dados, "fonteRecursos"),
    dataContratacao: data(dados, "dataContratacao"),
    foiRenegociadoOuProrrogado: booleano(dados, "foiRenegociadoOuProrrogado"),
    dataRenegociacaoOuProrrogacao: data(dados, "dataRenegociacaoOuProrrogacao"),
    situacaoAdimplencia,
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
    dataVencimento: data(dados, "dataVencimento"),
    dataPedidoAlongamento: data(dados, "dataPedidoAlongamento"),
    hipotesesMcr: listaTexto(dados, "hipotesesMcr") as HipoteseMcr[],
    laudoUnilateral: booleano(dados, "laudoUnilateral"),
    bancoConvidadoParaLaudo: booleano(dados, "bancoConvidadoParaLaudo"),
    houvePedidoAdministrativo: booleano(dados, "houvePedidoAdministrativo"),
    respostaBanco: texto(dados, "respostaBanco") as FatosAlongamento["respostaBanco"],
    recusaFundamentadaPorEscrito: booleano(dados, "recusaFundamentadaPorEscrito"),
  });

  const mutuarioDocumento = texto(dados, "mutuarioDocumento");
  const taxaMediaBcb = await buscarTaxaMediaBcbRural((mutuarioDocumento ?? "").replace(/\D/g, "").length === 14);
  const resultadoTaxas = analisarTaxasEEncargos(
    {
      mutuarioDocumento,
      taxaJurosContratual: numero(dados, "taxaJurosContratual"),
      temClausulaCapitalizacao: booleano(dados, "temClausulaCapitalizacao"),
      periodicidadeCapitalizacao: texto(dados, "periodicidadeCapitalizacao") as PeriodicidadeCapitalizacao | null,
      multaMoratoriaPercentual: numero(dados, "multaMoratoriaPercentual"),
      temComissaoPermanencia: booleano(dados, "temComissaoPermanencia"),
      comissaoPermanenciaCumulada: booleano(dados, "comissaoPermanenciaCumulada"),
    },
    taxaMediaBcb
  );

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
      mutuarioDocumento,
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
      permaneceInadimplenteEm31Mai2026: booleano(dados, "permaneceInadimplenteEm31Mai2026"),
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

      temClausulaCapitalizacao: booleano(dados, "temClausulaCapitalizacao"),
      periodicidadeCapitalizacao: texto(dados, "periodicidadeCapitalizacao"),
      multaMoratoriaPercentual: numero(dados, "multaMoratoriaPercentual"),
      temComissaoPermanencia: booleano(dados, "temComissaoPermanencia"),
      comissaoPermanenciaCumulada: booleano(dados, "comissaoPermanenciaCumulada"),
      resultadoTaxas: (resultadoTaxas as unknown) as never,

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
      instituicaoFinanceiraCnpj: texto(dados, "instituicaoFinanceiraCnpj"),
      enderecoBancoReu: texto(dados, "enderecoBancoReu"),
      comarcaForo: texto(dados, "comarcaForo"),
      varaForo: texto(dados, "varaForo"),
      valorCausa: numero(dados, "valorCausa"),

      solicitadoPorId: usuario.id,
    },
  });

  revalidatePath("/agrojud/painel/contratos");

  // Envio em lote (vários contratos, um PDF de cada vez): a tela mantém a
  // fila em memória e avança sozinha para o próximo arquivo — navegar para o
  // contrato recém-criado perderia essa fila. Fora do lote, o comportamento
  // de sempre continua: vai direto para o contrato criado.
  if (texto(dados, "modoLote") === "1") {
    return { ok: true, contratoId: contrato.id };
  }

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

// ---------------------------------------------------------------------
// Anexos: OAB do advogado, laudo de frustração de safra, laudo de
// capacidade de pagamento.
// ---------------------------------------------------------------------

/**
 * Recalcula o parecer a partir dos fatos atuais do contrato — usado depois
 * de um anexo completar um fato que faltava (perda de safra, laudo,
 * pedido/resposta administrativa).
 *
 * Só toca no enquadramento da MP 1.376 e no alongamento: o enquadramento
 * como CRÉDITO RURAL (Lei 4.829/65) depende de "mutuário é produtor?" e
 * "finalidade é rural?" — dois fatos que só existem no formulário na hora
 * da criação, não ficam guardados como coluna própria no contrato. Refazer
 * esse cálculo aqui, sem eles, regrediria um "atende" confirmado para
 * "indeterminado". Nenhum anexo hoje (OAB, laudo de safra, laudo de
 * capacidade de pagamento) traz fato novo para ESSE enquadramento — por
 * isso ele fica de fora do recálculo, de propósito.
 */
async function reanalisar(contratoId: string): Promise<void> {
  const c = await prisma.agroContrato.findUniqueOrThrow({ where: { id: contratoId } });

  const { resultadoMp1376, resultadoAlongamento } = analisarContrato({
    categoriaOperacao: c.categoriaOperacao as FatosContrato["categoriaOperacao"],
    mutuarioEProdutorOuCooperativa: null, // não usado nesta chamada — ver comentário acima
    finalidadeERural: null,
    fonteRecursos: c.fonteRecursos,
    dataContratacao: c.dataContratacao,
    foiRenegociadoOuProrrogado: c.foiRenegociadoOuProrrogado,
    dataRenegociacaoOuProrrogacao: c.dataRenegociacaoOuProrrogacao,
    situacaoAdimplencia: c.situacaoAdimplencia as FatosContrato["situacaoAdimplenciaNaContratacaoNovaLinha"],
    dataInicioInadimplencia: c.dataInicioInadimplencia,
    permaneceInadimplenteEm31Mai2026: c.permaneceInadimplenteEm31Mai2026,
    categoriaBeneficiario: c.categoriaBeneficiario as FatosContrato["categoriaBeneficiario"],
    valorOperacao: c.valorOperacao ? Number(c.valorOperacao) : null,
    numeroSafrasComPerda: c.numeroSafrasComPerda,
    percentualReducaoRenda: c.percentualReducaoRenda ? Number(c.percentualReducaoRenda) : null,
    causaPerda: c.causaPerda as FatosContrato["causaPerda"],
    temLaudoTecnico: c.temLaudoTecnico,
    origemFundoSocial: c.origemFundoSocial,
    origemMP1314_2025: c.origemMP1314_2025,
    encaminhadoDividaAtivaUniao: c.encaminhadoDividaAtivaUniao,
    dataVencimento: c.dataVencimento,
    dataPedidoAlongamento: c.dataPedidoAlongamento,
    hipotesesMcr: (c.hipotesesMcr as HipoteseMcr[] | null) ?? [],
    laudoUnilateral: c.laudoUnilateral,
    bancoConvidadoParaLaudo: c.bancoConvidadoParaLaudo,
    houvePedidoAdministrativo: c.houvePedidoAdministrativo,
    respostaBanco: c.respostaBanco as FatosAlongamento["respostaBanco"],
    recusaFundamentadaPorEscrito: c.recusaFundamentadaPorEscrito,
  });

  // A comparação com o Banco Central usa dado vivo (a taxa média do mês
  // corrente) — refazer aqui garante que ela nunca fica presa ao valor do
  // dia da criação do contrato.
  const taxaMediaBcb = await buscarTaxaMediaBcbRural((c.mutuarioDocumento ?? "").replace(/\D/g, "").length === 14);
  const resultadoTaxas = analisarTaxasEEncargos(
    {
      mutuarioDocumento: c.mutuarioDocumento,
      taxaJurosContratual: c.taxaJurosContratual ? Number(c.taxaJurosContratual) : null,
      temClausulaCapitalizacao: c.temClausulaCapitalizacao,
      periodicidadeCapitalizacao: c.periodicidadeCapitalizacao as PeriodicidadeCapitalizacao | null,
      multaMoratoriaPercentual: c.multaMoratoriaPercentual ? Number(c.multaMoratoriaPercentual) : null,
      temComissaoPermanencia: c.temComissaoPermanencia,
      comissaoPermanenciaCumulada: c.comissaoPermanenciaCumulada,
    },
    taxaMediaBcb
  );

  await prisma.agroContrato.update({
    where: { id: contratoId },
    data: {
      resultadoMp1376: (resultadoMp1376 as unknown) as never,
      resultadoAlongamento: (resultadoAlongamento as unknown) as never,
      resultadoTaxas: (resultadoTaxas as unknown) as never,
      analisadoEm: new Date(),
    },
  });
}

export type ResultadoAnexo = { erro?: string; ok?: boolean; anexoId?: string };

/** Lê um anexo por IA sem salvar nada — mesmo formato de `sugerirLeituraContrato`. */
export async function sugerirLeituraAnexo(
  tipo: TipoAnexo,
  dados: FormData
): Promise<{ ok: true; dados: RascunhoAnexo } | { ok: false; erro: string }> {
  const { conta } = await exigirEdicaoAgro();

  const arquivo = dados.get("arquivo");
  if (!arquivoComConteudo(arquivo)) return { ok: false, erro: "Selecione um arquivo primeiro." };
  if (arquivo.size > 15 * 1024 * 1024) return { ok: false, erro: "Arquivo maior que 15 MB." };

  try {
    const bytes = Buffer.from(await arquivo.arrayBuffer());
    const { dados: rascunho, erro } = await lerAnexoComIa(tipo, bytes, arquivo.type || null, conta.id);
    if (!rascunho) return { ok: false, erro: erro ?? "A IA não conseguiu ler o arquivo." };
    return { ok: true, dados: rascunho };
  } catch (falha) {
    const mensagem = falha instanceof Error ? `${falha.name}: ${falha.message}` : String(falha);
    await abrirAlerta({
      tipo: "IA_FALHANDO",
      gravidade: "ATENCAO",
      titulo: "Falha ao ler anexo por IA",
      detalhe: `A leitura do anexo quebrou antes de terminar. Detalhe técnico: ${mensagem.slice(0, 500)}. Tipo: ${tipo}. Conta: ${conta.id}.`,
    });
    return {
      ok: false,
      erro: "Não foi possível ler este arquivo agora. O preenchimento manual continua funcionando, e a falha foi registrada para a equipe.",
    };
  }
}

/** Salva o anexo no contrato — a leitura da IA (se houve) já revisada e confirmada. */
export async function anexarDocumento(_anterior: ResultadoAnexo, dados: FormData): Promise<ResultadoAnexo> {
  const { conta } = await exigirEdicaoAgro();

  const contratoId = texto(dados, "contratoId");
  if (!contratoId) return { erro: "Contrato não identificado." };
  const contrato = await prisma.agroContrato.findFirst({ where: { id: contratoId, agroContaId: conta.id } });
  if (!contrato) return { erro: "Contrato não encontrado." };

  const tipo = (texto(dados, "tipo") ?? "OUTRO") as TipoAnexo;
  const arquivo = dados.get("arquivo");
  if (!arquivoComConteudo(arquivo)) return { erro: "Selecione um arquivo." };
  if (arquivo.size > 15 * 1024 * 1024) return { erro: "Arquivo maior que 15 MB." };

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const hashSha256 = crypto.createHash("sha256").update(bytes).digest("hex");

  const leituraTexto = texto(dados, "leituraIaJson");
  let leituraIa: unknown = undefined;
  if (leituraTexto) {
    try {
      leituraIa = JSON.parse(leituraTexto);
    } catch {
      leituraIa = undefined;
    }
  }

  const anexo = await prisma.agroAnexo.create({
    data: {
      agroContratoId: contratoId,
      tipo,
      nomeArquivo: arquivo.name,
      arquivo: bytes,
      arquivoTipo: arquivo.type || null,
      hashSha256,
      leituraIa: (leituraIa as never) ?? undefined,
    },
  });

  // Os campos já foram confirmados pela pessoa e chegam junto no mesmo
  // envio (ver formulário) — aplica e recalcula o parecer numa só ida ao
  // banco, para a tela nunca mostrar um parecer desatualizado por um
  // instante sequer.
  const camposTexto = texto(dados, "camposConfirmadosJson");
  if (camposTexto) {
    try {
      const campos = JSON.parse(camposTexto) as RascunhoAnexo;
      await aplicarCamposDoAnexo(contratoId, tipo, campos);
    } catch {
      /* leitura não confirmada — anexo fica salvo, campos não mudam */
    }
  }

  revalidatePath(`/agrojud/painel/contratos/${contratoId}`);
  return { ok: true, anexoId: anexo.id };
}

/** Escreve no contrato só os campos que vieram confirmados, e recalcula o parecer. */
async function aplicarCamposDoAnexo(contratoId: string, tipo: TipoAnexo, campos: RascunhoAnexo): Promise<void> {
  const dados: Record<string, unknown> = {};
  if (campos.advogadoNome !== undefined) dados.advogadoNome = campos.advogadoNome;
  if (campos.advogadoOab !== undefined) dados.advogadoOab = campos.advogadoOab;
  if (campos.numeroSafrasComPerda !== undefined) dados.numeroSafrasComPerda = Math.trunc(campos.numeroSafrasComPerda);
  if (campos.anosSafrasComPerda !== undefined) dados.anosSafrasComPerda = campos.anosSafrasComPerda as never;
  if (campos.percentualReducaoRenda !== undefined) dados.percentualReducaoRenda = campos.percentualReducaoRenda;
  if (campos.causaPerda !== undefined) dados.causaPerda = campos.causaPerda;
  if (campos.eventosClimaticos !== undefined) dados.eventosClimaticos = campos.eventosClimaticos as never;
  if (campos.profissionalHabilitadoNome !== undefined) dados.profissionalHabilitadoNome = campos.profissionalHabilitadoNome;
  if (campos.profissionalHabilitadoRegistro !== undefined) dados.profissionalHabilitadoRegistro = campos.profissionalHabilitadoRegistro;
  if (campos.capacidadePagamentoComprometida !== undefined) dados.capacidadePagamentoComprometida = campos.capacidadePagamentoComprometida;
  if (campos.capacidadePagamentoResumo !== undefined) dados.capacidadePagamentoResumo = campos.capacidadePagamentoResumo;

  // Só o laudo de frustração de safra prova, por si, que existe laudo
  // técnico — anexar a OAB do advogado ou o laudo de capacidade de
  // pagamento não pode marcar isto (são documentos diferentes).
  if (tipo === "LAUDO_FRUSTRACAO_SAFRA" && Object.keys(dados).length > 0) {
    dados.temLaudoTecnico = true;
  }

  if (Object.keys(dados).length === 0) return;

  await prisma.agroContrato.update({ where: { id: contratoId }, data: dados as never });
  await reanalisar(contratoId);
}

export async function excluirAnexo(id: string): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoAgro();

  const anexo = await prisma.agroAnexo.findFirst({
    where: { id, agroContrato: { agroContaId: conta.id } },
    select: { id: true, agroContratoId: true },
  });
  if (!anexo) return { erro: "Anexo não encontrado." };

  await prisma.agroAnexo.delete({ where: { id } });
  revalidatePath(`/agrojud/painel/contratos/${anexo.agroContratoId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Peça redigida livremente pela IA (requerimento administrativo ou
// petição inicial) — escolha explícita do cliente. Cada geração fica
// arquivada como um `AgroDocumentoGerado`, com o texto bruto da IA e o
// contexto de fatos que ela recebeu, formando o dossiê do caso.
// ---------------------------------------------------------------------

export type ResultadoDocumentoGerado = { erro?: string; ok?: boolean; documentoId?: string };

export async function gerarPeticaoComIa(contratoId: string, tipo: TipoPeticaoIa): Promise<ResultadoDocumentoGerado> {
  const { usuario, conta } = await exigirEdicaoAgro();

  const contrato = await prisma.agroContrato.findFirst({
    where: { id: contratoId, agroContaId: conta.id },
    include: { anexos: true },
  });
  if (!contrato) return { erro: "Contrato não encontrado." };
  if (!contrato.resultadoAlongamento) return { erro: "Este contrato ainda não tem análise de alongamento." };

  try {
    const acompanhamento = await obterAcompanhamentoMp();
    const resultado = await gerarPeticaoIaCompleta(
      tipo,
      contrato,
      contrato.anexos.map((a) => ({ tipo: a.tipo, nomeArquivo: a.nomeArquivo })),
      avisoParaPeca(acompanhamento.vigencia),
      conta.id
    );

    if (!resultado.ok) return { erro: resultado.erro };

    const documento = await prisma.agroDocumentoGerado.create({
      data: {
        agroContratoId: contratoId,
        tipo,
        origem: "IA",
        nomeArquivo: resultado.nomeArquivo,
        arquivo: resultado.buffer,
        hashSha256: resultado.hashSha256,
        conteudoIa: resultado.texto,
        contextoAnalise: resultado.contexto as never,
        geradoPorId: usuario.id,
      },
    });

    revalidatePath(`/agrojud/painel/contratos/${contratoId}`);
    return { ok: true, documentoId: documento.id };
  } catch (falha) {
    const mensagem = falha instanceof Error ? `${falha.name}: ${falha.message}` : String(falha);
    await abrirAlerta({
      tipo: "IA_FALHANDO",
      gravidade: "ATENCAO",
      titulo: "Falha ao gerar peça por IA",
      detalhe: `A geração da peça quebrou antes de terminar. Detalhe técnico: ${mensagem.slice(0, 500)}. Tipo: ${tipo}. Contrato: ${contratoId}.`,
    });
    return {
      ok: false,
      erro: "Não foi possível gerar a peça agora. A falha foi registrada para a equipe — tente novamente em alguns instantes.",
    };
  }
}

export async function excluirDocumentoGerado(id: string): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoAgro();

  const documento = await prisma.agroDocumentoGerado.findFirst({
    where: { id, agroContrato: { agroContaId: conta.id } },
    select: { id: true, agroContratoId: true },
  });
  if (!documento) return { erro: "Documento não encontrado." };

  await prisma.agroDocumentoGerado.delete({ where: { id } });
  revalidatePath(`/agrojud/painel/contratos/${documento.agroContratoId}`);
  return { ok: true };
}
