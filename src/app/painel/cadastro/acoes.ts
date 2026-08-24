"use server";

import { exigirEdicao } from "@/lib/sessao";
import { registrar } from "@/lib/registro";
import { preencherPorDocumento } from "@/lib/cadastro/por-documento";
import type { ResultadoLeitura } from "@/lib/ia/leitura";

export type ResultadoBusca = {
  erro?: string;
  leitura?: ResultadoLeitura;
  /** Para a tela trocar sozinha entre pessoa física e jurídica. */
  tipo?: "PF" | "PJ";
};

/**
 * Busca o cadastro pelo documento colado.
 *
 * Não grava nada: devolve os campos para conferência, igual à leitura de
 * documento. A diferença é a origem — aqui vem da base oficial, sem
 * interpretação, e por isso os campos voltam com confiança alta.
 */
export async function buscarPorDocumento(
  _anterior: ResultadoBusca,
  dados: FormData
): Promise<ResultadoBusca> {
  const { usuario, organizacao } = await exigirEdicao();

  const documento = (dados.get("documentoBusca")?.toString() ?? "").trim();
  const dataNascimento = (dados.get("dataNascimentoBusca")?.toString() ?? "").trim() || null;

  if (!documento) return { erro: "Cole o CPF ou o CNPJ." };

  const resultado = await preencherPorDocumento({ documento, dataNascimento });

  if (!resultado.ok) return { erro: resultado.erro };

  await registrar({
    acao: "CONSULTAR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "CadastroPorDocumento",
    detalhe: {
      documento,
      tipo: resultado.tipo,
      camposEncontrados: Object.keys(resultado.leitura.campos).length,
    },
  });

  return { leitura: resultado.leitura, tipo: resultado.tipo };
}
