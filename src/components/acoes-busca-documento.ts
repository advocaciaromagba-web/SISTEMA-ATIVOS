"use server";

/**
 * Busca de cadastro pelo CPF/CNPJ, para as telas que preenchem uma parte.
 *
 * Esta ação existe separada por causa de um bug real: o componente
 * `BuscarPorDocumento` é usado em quatro soluções (Gestão de ativos,
 * Licitações, Compliance e Due diligence), mas chamava a ação que morava
 * dentro da Gestão de ativos — e essa ação exigia a sessão DA GESTÃO DE
 * ATIVOS. Quem estava no Compliance não tem essa sessão, então o servidor
 * respondia com um redirecionamento para o login da Gestão de ativos: a tela
 * de cadastro simplesmente sumia e voltava para o "entrar", no meio da
 * digitação do CNPJ, sem mensagem nenhuma.
 *
 * A correção é conferir a sessão DA SOLUÇÃO de onde a tela veio. A chave da
 * solução chega pelo formulário, e isso não abre brecha: ela só escolhe qual
 * sessão será exigida, e ninguém consegue exigir uma sessão que não tem —
 * mentir na chave dá redirecionamento, não acesso.
 */
import { contaLogadaDaSolucao } from "@/lib/sessao-por-solucao";
import { preencherPorDocumento } from "@/lib/cadastro/por-documento";
import { registrar } from "@/lib/registro";
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
 * Não grava nada no cadastro: devolve os campos para conferência, igual à
 * leitura de documento. A diferença é a origem — aqui vem da base oficial,
 * sem interpretação, e por isso os campos voltam com confiança alta.
 */
export async function buscarPorDocumento(
  _anterior: ResultadoBusca,
  dados: FormData
): Promise<ResultadoBusca> {
  const solucao = (dados.get("solucao")?.toString() ?? "").trim();

  const conta = await contaLogadaDaSolucao(solucao);
  if (!conta) return { erro: "Não foi possível identificar de qual solução veio esta tela." };
  if (!conta.podeEditar) return { erro: "Seu acesso é somente de leitura." };

  const documento = (dados.get("documentoBusca")?.toString() ?? "").trim();
  const dataNascimento = (dados.get("dataNascimentoBusca")?.toString() ?? "").trim() || null;

  if (!documento) return { erro: "Cole o CPF ou o CNPJ." };

  const resultado = await preencherPorDocumento({ documento, dataNascimento });

  if (!resultado.ok) return { erro: resultado.erro };

  // O registro de auditoria de consulta só existe na Gestão de ativos
  // (`LogAuditoria`). As outras soluções têm tabelas próprias, com outro
  // propósito — a do Compliance, por exemplo, é a que conta a cota de
  // análises do teste, e gravar uma busca de cadastro nela faria a cota
  // andar sozinha. Registrar nas demais depende de criar o lugar certo, e
  // fica anotado como pendência em vez de virar dado errado.
  if (solucao === "GESTAO_ATIVOS") {
    await registrar({
      acao: "CONSULTAR",
      organizacaoId: conta.contaId,
      usuarioId: conta.usuarioId,
      entidade: "CadastroPorDocumento",
      detalhe: {
        documento,
        tipo: resultado.tipo,
        camposEncontrados: Object.keys(resultado.leitura.campos).length,
      },
    });
  }

  return { leitura: resultado.leitura, tipo: resultado.tipo };
}
