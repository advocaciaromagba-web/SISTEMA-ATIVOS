/**
 * Busca de oportunidades no Portal Nacional de Contratações Públicas (PNCP).
 *
 * API pública, sem chave — descoberta lendo as chamadas de rede que a busca
 * oficial (pncp.gov.br/app/editais) faz, já que o PNCP não publica manual
 * para ela (o manual oficial só documenta a API de ENVIO de dados, usada por
 * quem publica edital, não por quem consulta). Contrato confirmado com
 * requisição real em 28/08/2026: `modalidades`, `ufs` e `q` filtram de
 * verdade.
 *
 * Duas coisas que o PNCP não oferece, e por isso não têm parâmetro aqui:
 * - Atividade econômica: o PNCP não classifica edital por CNAE nem segmento.
 *   O que a busca oficial tem é palavra-chave (`q`) contra título e objeto —
 *   é o que faz as vezes de "atividade" aqui: aproximado, não uma categoria.
 * - Valor: o edital, na publicação, não vem com valor estimado nenhum no
 *   resultado da busca (testado com 50 editais reais — nenhum tinha
 *   `valor_global` preenchido). O valor só aparece dentro do edital já
 *   aberto, item por item.
 */

const BASE = "https://pncp.gov.br/api/search/";

export const MODALIDADES_PNCP = [
  { id: "6", nome: "Pregão - Eletrônico" },
  { id: "7", nome: "Pregão - Presencial" },
  { id: "4", nome: "Concorrência - Eletrônica" },
  { id: "5", nome: "Concorrência - Presencial" },
  { id: "8", nome: "Dispensa" },
  { id: "9", nome: "Inexigibilidade" },
  { id: "12", nome: "Credenciamento" },
  { id: "1", nome: "Leilão - Eletrônico" },
  { id: "13", nome: "Leilão - Presencial" },
  { id: "11", nome: "Pré-qualificação" },
] as const;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export type OportunidadePncp = {
  numeroControlePncp: string;
  titulo: string;
  objeto: string;
  orgao: string;
  municipio: string | null;
  uf: string;
  modalidade: string;
  situacao: string;
  dataAtualizacao: string | null;
  link: string;
};

type ItemBrutoPncp = {
  numero_controle_pncp: string;
  title: string;
  description: string;
  orgao_nome: string;
  orgao_cnpj: string;
  ano: string;
  numero_sequencial: string;
  municipio_nome: string | null;
  uf: string;
  modalidade_licitacao_nome: string;
  situacao_nome: string;
  data_atualizacao_pncp: string | null;
};

/**
 * Busca editais/avisos de contratação recebendo proposta, filtrados pelo que
 * o PNCP de fato filtra: modalidade, UF e palavra-chave.
 */
export async function buscarOportunidadesPncp(params: {
  modalidade?: string;
  uf?: string;
  palavraChave?: string;
  pagina?: number;
}): Promise<{ ok: true; total: number; itens: OportunidadePncp[] } | { ok: false; erro: string }> {
  const query = new URLSearchParams({
    tipos_documento: "edital",
    ordenacao: "-data",
    status: "recebendo_proposta",
    pagina: String(params.pagina ?? 1),
    tam_pagina: "20",
  });
  if (params.modalidade) query.set("modalidades", params.modalidade);
  if (params.uf) query.set("ufs", params.uf);
  if (params.palavraChave?.trim()) query.set("q", params.palavraChave.trim());

  // O PNCP reseta a conexão de vez em quando, sem relação com os parâmetros
  // (testado: a mesma requisição falha e funciona em tentativas seguidas) —
  // duas tentativas a mais absorvem essa instabilidade antes de desistir.
  let ultimoErro = "";
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    if (tentativa > 0) await new Promise((r) => setTimeout(r, 400 * tentativa));

    try {
      const resposta = await fetch(`${BASE}?${query.toString()}`, { signal: AbortSignal.timeout(15_000) });
      if (!resposta.ok) {
        ultimoErro = `PNCP respondeu HTTP ${resposta.status}.`;
        continue;
      }

      const dados = (await resposta.json()) as { total: number; items: ItemBrutoPncp[] };
      return montarResultado(dados);
    } catch (erro) {
      ultimoErro = `Falha ao consultar o PNCP: ${(erro as Error).message}`;
    }
  }

  return { ok: false, erro: ultimoErro };
}

function montarResultado(dados: { total: number; items: ItemBrutoPncp[] }): {
  ok: true;
  total: number;
  itens: OportunidadePncp[];
} {
  return {
    ok: true,
    total: dados.total,
    itens: dados.items.map((i) => ({
      numeroControlePncp: i.numero_controle_pncp,
      titulo: i.title,
      objeto: i.description,
      orgao: i.orgao_nome,
      municipio: i.municipio_nome,
      uf: i.uf,
      modalidade: i.modalidade_licitacao_nome,
      situacao: i.situacao_nome,
      dataAtualizacao: i.data_atualizacao_pncp,
      // A rota pública do site (/app/editais/...) é diferente do caminho
      // interno que a API devolve (/compras/...) — construída à mão a
      // partir do CNPJ, ano e sequencial, conferida contra o link real.
      link: `https://pncp.gov.br/app/editais/${i.orgao_cnpj}/${i.ano}/${i.numero_sequencial}`,
    })),
  };
}
