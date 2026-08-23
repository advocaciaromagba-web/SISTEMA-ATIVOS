"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEdicao } from "@/lib/sessao";
import { registrar } from "@/lib/registro";
import { somenteNumeros, validarNumeroProcessoCnj } from "@/lib/validacao";
import { situacaoDaParte } from "@/lib/auditoria/executar";
import type { ResultadoAcao } from "../pessoas/acoes";

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

/** Converte "1.234,56" (como se digita no Brasil) para número. */
function decimal(dados: FormData, chave: string): number | null {
  const bruto = texto(dados, chave);
  if (!bruto) return null;
  const limpo = bruto.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** Próximo código sequencial da organização: OP-0001, OP-0002... */
async function proximoCodigo(organizacaoId: string): Promise<string> {
  const ultima = await prisma.operacao.findFirst({
    where: { organizacaoId },
    orderBy: { criadoEm: "desc" },
    select: { codigo: true },
  });

  const numeroAtual = Number(ultima?.codigo?.replace(/\D/g, "") ?? 0);
  return `OP-${String(numeroAtual + 1).padStart(4, "0")}`;
}

export async function salvarOperacao(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  const id = texto(dados, "id");
  const titulo = texto(dados, "titulo");
  const tipoAtivo = texto(dados, "tipoAtivo");

  if (!titulo) return { erro: "Dê um nome à operação — é como você vai encontrá-la depois." };
  if (!tipoAtivo) return { erro: "Escolha o tipo de ativo." };

  const numeroProcesso = somenteNumeros(texto(dados, "numeroProcesso")) || null;
  if (numeroProcesso && numeroProcesso.length === 20 && !validarNumeroProcessoCnj(numeroProcesso)) {
    return { erro: "O número do processo não confere com o padrão do CNJ. Revise os dígitos." };
  }

  const valorFace = decimal(dados, "valorFace");
  const valorNegociado = decimal(dados, "valorNegociado");
  let desagio = decimal(dados, "desagioPercentual");

  // Se o usuário informou os dois valores e não o deságio, o sistema calcula —
  // conta que o operador faria na calculadora e erraria de vez em quando.
  if (desagio == null && valorFace && valorNegociado && valorFace > 0) {
    desagio = Number((((valorFace - valorNegociado) / valorFace) * 100).toFixed(4));
  }

  const valores = {
    titulo,
    tipoAtivo,
    descricao: texto(dados, "descricao"),
    moeda: texto(dados, "moeda") ?? "BRL",
    valorFace,
    valorNegociado,
    desagioPercentual: desagio,
    comissaoPercentual: decimal(dados, "comissaoPercentual"),
    tribunal: texto(dados, "tribunal"),
    numeroPrecatorio: texto(dados, "numeroPrecatorio"),
    numeroProcesso,
    enteDevedor: texto(dados, "enteDevedor"),
    esferaDevedor: texto(dados, "esferaDevedor"),
    naturezaCredito: texto(dados, "naturezaCredito"),
    anoOrcamentario: texto(dados, "anoOrcamentario") ? Number(texto(dados, "anoOrcamentario")) : null,
    tributo: texto(dados, "tributo"),
    ufCredito: texto(dados, "ufCredito")?.toUpperCase() ?? null,
    processoAdmin: texto(dados, "processoAdmin"),
    produto: texto(dados, "produto"),
    quantidade: decimal(dados, "quantidade"),
    unidade: texto(dados, "unidade"),
    incoterm: texto(dados, "incoterm"),
    origem: texto(dados, "origem"),
    destino: texto(dados, "destino"),
    embarque: texto(dados, "embarque"),
    fase: texto(dados, "fase") ?? "PROSPECCAO",
    confidencial: dados.get("confidencial") === "on",
  };

  let operacaoId: string;

  if (id) {
    const existente = await prisma.operacao.findFirst({ where: { id, organizacaoId: organizacao.id } });
    if (!existente) return { erro: "Operação não encontrada." };

    await prisma.operacao.update({ where: { id }, data: valores });
    operacaoId = id;
    await registrar({
      acao: "EDITAR",
      organizacaoId: organizacao.id,
      usuarioId: usuario.id,
      entidade: "Operacao",
      entidadeId: id,
      detalhe: { titulo },
    });
  } else {
    const criada = await prisma.operacao.create({
      data: { ...valores, organizacaoId: organizacao.id, codigo: await proximoCodigo(organizacao.id) },
    });
    operacaoId = criada.id;
    await registrar({
      acao: "CRIAR",
      organizacaoId: organizacao.id,
      usuarioId: usuario.id,
      entidade: "Operacao",
      entidadeId: operacaoId,
      detalhe: { titulo, codigo: criada.codigo },
    });
  }

  revalidatePath("/painel/operacoes");
  redirect(`/painel/operacoes/${operacaoId}`);
}

// ---------------------------------------------------------------------
// Partes da operação
// ---------------------------------------------------------------------

export async function vincularParte(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  const operacaoId = texto(dados, "operacaoId");
  const pessoaId = texto(dados, "pessoaId");
  const papel = texto(dados, "papel");

  if (!operacaoId || !pessoaId || !papel) return { erro: "Escolha a parte e o papel." };

  // Confere que ambos pertencem à organização de quem está logado.
  const [operacao, pessoa] = await Promise.all([
    prisma.operacao.findFirst({ where: { id: operacaoId, organizacaoId: organizacao.id } }),
    prisma.pessoa.findFirst({ where: { id: pessoaId, organizacaoId: organizacao.id } }),
  ]);
  if (!operacao || !pessoa) return { erro: "Operação ou parte não encontrada." };

  // Trava de auditoria: parte com restricao nao entra em operacao.
  const situacao = situacaoDaParte(pessoa);
  if (!situacao.liberada) {
    return {
      erro:
        `${pessoa.nome} não pode ser vinculada: ${situacao.motivo} ` +
        (situacao.precisaAuditar
          ? "Abra o cadastro da parte e execute a auditoria."
          : "Abra o cadastro da parte para ver o dossiê e decidir."),
    };
  }

  const comissao = decimal(dados, "comissaoPercentual");
  const ordem = texto(dados, "ordemCadeia") ? Number(texto(dados, "ordemCadeia")) : null;

  try {
    await prisma.parteOperacao.create({
      data: {
        operacaoId,
        pessoaId,
        papel,
        comissaoPercentual: comissao,
        ordemCadeia: ordem,
        observacao: texto(dados, "observacao"),
      },
    });
  } catch {
    return { erro: "Esta parte já está vinculada à operação com esse mesmo papel." };
  }

  await registrar({
    acao: "EDITAR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Operacao",
    entidadeId: operacaoId,
    detalhe: { vinculou: pessoa.nome, papel },
  });

  revalidatePath(`/painel/operacoes/${operacaoId}`);
  return { ok: true };
}

export async function desvincularParte(parteId: string): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  const parte = await prisma.parteOperacao.findFirst({
    where: { id: parteId, operacao: { organizacaoId: organizacao.id } },
    include: { pessoa: { select: { nome: true } } },
  });
  if (!parte) return { erro: "Vínculo não encontrado." };

  await prisma.parteOperacao.delete({ where: { id: parteId } });
  await registrar({
    acao: "EDITAR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Operacao",
    entidadeId: parte.operacaoId,
    detalhe: { desvinculou: parte.pessoa.nome, papel: parte.papel },
  });

  revalidatePath(`/painel/operacoes/${parte.operacaoId}`);
  return { ok: true };
}
