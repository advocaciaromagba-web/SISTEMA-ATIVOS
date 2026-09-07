/**
 * Planos e preços de cada solução, lidos do banco.
 *
 * Substitui os arquivos de plano espalhados pelo código. A regra é simples e
 * vale para tudo daqui para frente: **nenhuma solução herda preço de outra**.
 * Duas soluções podem ter um plano chamado "Essencial" e serem preços
 * diferentes — são linhas diferentes, sem nada em comum além do nome.
 *
 * A leitura é sempre por solução. Não existe função que devolva "todos os
 * planos da plataforma" para uso nas telas de venda: se existisse, alguém
 * acabaria mostrando o plano de uma solução dentro de outra, que é
 * exatamente o problema que este arquivo veio resolver. A administração é a
 * única que enxerga tudo junto, e por outra porta.
 */
import { prisma } from "@/lib/prisma";

export type PlanoDaSolucao = {
  id: string;
  chave: string;
  nome: string;
  paraQuem: string | null;
  precoMensal: number;
  precoAnual: number;
  inclui: string[];
  naoInclui: string[];
  destaque: boolean;
  ordem: number;
  ativo: boolean;
};

export type ConfiguracaoDaSolucao = {
  diasDeTeste: number;
  consultasGratisTeste: number;
};

/** Usado quando a solução ainda não tem configuração cadastrada. */
const CONFIGURACAO_PADRAO: ConfiguracaoDaSolucao = { diasDeTeste: 3, consultasGratisTeste: 3 };

function converter(linha: {
  id: string;
  chave: string;
  nome: string;
  paraQuem: string | null;
  precoMensal: unknown;
  precoAnual: unknown;
  inclui: unknown;
  naoInclui: unknown;
  destaque: boolean;
  ordem: number;
  ativo: boolean;
}): PlanoDaSolucao {
  return {
    id: linha.id,
    chave: linha.chave,
    nome: linha.nome,
    paraQuem: linha.paraQuem,
    precoMensal: Number(linha.precoMensal),
    precoAnual: Number(linha.precoAnual),
    inclui: Array.isArray(linha.inclui) ? (linha.inclui as string[]) : [],
    naoInclui: Array.isArray(linha.naoInclui) ? (linha.naoInclui as string[]) : [],
    destaque: linha.destaque,
    ordem: linha.ordem,
    ativo: linha.ativo,
  };
}

/** Planos à venda de uma solução, na ordem em que devem aparecer. */
export async function planosDaSolucao(solucao: string): Promise<PlanoDaSolucao[]> {
  const linhas = await prisma.planoSolucao.findMany({
    where: { solucao, ativo: true },
    orderBy: [{ ordem: "asc" }, { precoMensal: "asc" }],
  });
  return linhas.map(converter);
}

/** Inclui os planos fora de venda — para a administração e para quem já assinou. */
export async function todosOsPlanosDaSolucao(solucao: string): Promise<PlanoDaSolucao[]> {
  const linhas = await prisma.planoSolucao.findMany({
    where: { solucao },
    orderBy: [{ ordem: "asc" }, { precoMensal: "asc" }],
  });
  return linhas.map(converter);
}

/** Um plano específico. Devolve `null` se não existir NAQUELA solução. */
export async function planoDaSolucao(solucao: string, chave: string): Promise<PlanoDaSolucao | null> {
  const linha = await prisma.planoSolucao.findUnique({ where: { solucao_chave: { solucao, chave } } });
  return linha ? converter(linha) : null;
}

/**
 * Preço de um plano, para cobrança.
 *
 * Recebe a solução junto de propósito: cobrar pelo preço certo depende de
 * saber de qual solução se está falando, e um `chave` sozinho ("ESSENCIAL")
 * não diz isso. Esta assinatura torna impossível cobrar o Essencial de uma
 * solução no valor do Essencial de outra.
 */
export async function precoParaCobranca(
  solucao: string,
  chave: string,
  ciclo: "MENSAL" | "ANUAL"
): Promise<number | null> {
  const plano = await planoDaSolucao(solucao, chave);
  if (!plano || !plano.ativo) return null;
  return ciclo === "ANUAL" ? plano.precoAnual : plano.precoMensal;
}

export async function configuracaoDaSolucao(solucao: string): Promise<ConfiguracaoDaSolucao> {
  const linha = await prisma.configuracaoSolucao.findUnique({ where: { solucao } });
  if (!linha) return CONFIGURACAO_PADRAO;
  return { diasDeTeste: linha.diasDeTeste, consultasGratisTeste: linha.consultasGratisTeste };
}
