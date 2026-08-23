"use server";

import { exigirSessao } from "@/lib/sessao";
import { registrar } from "@/lib/registro";
import { dataDeTexto } from "@/lib/calculo/indices";
import {
  atualizarPrecatorio,
  calcularCessao,
  calcularDeducoes,
  type ResultadoCalculo,
  type ResultadoCessao,
  type ResultadoDeducoes,
} from "@/lib/calculo/precatorio";

export type ResultadoCalculadora = {
  erro?: string;
  atualizacao?: ResultadoCalculo;
  deducoes?: ResultadoDeducoes;
  cessao?: ResultadoCessao;
};

const texto = (d: FormData, chave: string) => (d.get(chave)?.toString() ?? "").trim();

/** Converte "1.234,56" para número. */
function numero(d: FormData, chave: string, padrao = 0): number {
  const bruto = texto(d, chave);
  if (!bruto) return padrao;
  const limpo = bruto.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : padrao;
}

export async function calcular(_anterior: ResultadoCalculadora, dados: FormData): Promise<ResultadoCalculadora> {
  const { usuario, organizacao } = await exigirSessao();

  const valorOriginal = numero(dados, "valorOriginal");
  const dataBaseTexto = texto(dados, "dataBase");
  const dataFinalTexto = texto(dados, "dataFinal");

  if (valorOriginal <= 0) return { erro: "Informe o valor da conta de liquidação." };
  if (!dataBaseTexto || !dataFinalTexto) return { erro: "Informe a data-base e a data final do cálculo." };

  const dataBase = dataDeTexto(dataBaseTexto);
  const dataFinal = dataDeTexto(dataFinalTexto);

  if (dataFinal < dataBase) return { erro: "A data final é anterior à data-base." };

  const apresentacaoTexto = texto(dados, "dataApresentacao");
  const anoOrcamentario = texto(dados, "anoOrcamentario") ? Number(texto(dados, "anoOrcamentario")) : null;

  let atualizacao: ResultadoCalculo;
  try {
    atualizacao = await atualizarPrecatorio({
      valorOriginal,
      dataBase,
      dataFinal,
      natureza: texto(dados, "naturezaRelacao") === "TRIBUTARIA" ? "TRIBUTARIA" : "NAO_TRIBUTARIA",
      jurosMensalAntigo: numero(dados, "jurosMensalAntigo", 0.5),
      dataApresentacao: apresentacaoTexto ? dataDeTexto(apresentacaoTexto) : null,
      anoOrcamentario,
      aplicarSumula17: dados.get("aplicarSumula17") === "on",
    });
  } catch (erro) {
    return { erro: `Não foi possível buscar os índices no Banco Central: ${(erro as Error).message}` };
  }

  const deducoes = calcularDeducoes({
    valorBruto: atualizacao.valorAtualizado,
    parcelaJuros: atualizacao.jurosTotal,
    natureza: texto(dados, "naturezaCredito") === "ALIMENTAR" ? "ALIMENTAR" : "COMUM",
    mesesAcumulados: Math.max(1, atualizacao.linhas.length),
    jurosIsentosDeIr: dados.get("jurosIsentosDeIr") === "on",
    honorariosJaDestacados: texto(dados, "tratamentoHonorarios") === "DESTACADOS",
    honorariosContratuaisPercentual:
      texto(dados, "tratamentoHonorarios") === "DEDUZIR" ? numero(dados, "honorariosContratuaisPercentual") : 0,
    honorariosSucumbenciais: numero(dados, "honorariosSucumbenciais"),
    contribuicaoPrevidenciaria: numero(dados, "contribuicaoPrevidenciaria"),
  });

  const cessao = calcularCessao({
    valorLiquido: deducoes.valorLiquido,
    desagioPercentual: numero(dados, "desagioPercentual"),
    comissoesPercentual: numero(dados, "comissoesPercentual"),
  });

  await registrar({
    acao: "CONSULTAR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Calculadora",
    detalhe: {
      valorOriginal,
      valorAtualizado: Number(atualizacao.valorAtualizado.toFixed(2)),
      valorCessao: Number(cessao.valorCessao.toFixed(2)),
      periodo: `${dataBaseTexto} a ${dataFinalTexto}`,
    },
  });

  return { atualizacao, deducoes, cessao };
}
