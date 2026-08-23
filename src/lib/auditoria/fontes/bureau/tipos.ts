/**
 * O que a plataforma espera de um bureau de crédito, seja ele qual for.
 *
 * Cada fornecedor devolve um formato diferente. Em vez de espalhar essa
 * diferença pelo sistema, cada um tem um adaptador que traduz para esta
 * estrutura única. Trocar de fornecedor — ou usar dois ao mesmo tempo — não
 * mexe em nenhuma regra de análise.
 */

export type LeituraBureau = {
  // ----- pontuação -----
  /** Score de crédito do fornecedor. Faixa varia: Serasa usa 0 a 1000. */
  score: number | null;
  scoreMaximo: number | null;
  scoreFaixa: string | null;

  // ----- restrições financeiras -----
  pendenciasFinanceiras: number | null;
  valorPendencias: number | null;
  protestos: number | null;
  valorProtestos: number | null;
  chequesSemFundo: number | null;
  dividaAtiva: number | null;
  valorDividaAtiva: number | null;

  // ----- situação da empresa -----
  falencia: boolean | null;
  recuperacaoJudicial: boolean | null;
  situacaoReceita: string | null;

  // ----- litígio -----
  acoesJudiciais: number | null;
  valorAcoesJudiciais: number | null;

  // ----- porte e capacidade -----
  faturamentoPresumido: number | null;
  limiteCreditoSugerido: number | null;

  // ----- sinais de comportamento -----
  /** Muitas consultas recentes indicam alguém procurando crédito em vários lugares. */
  consultasUltimos90Dias: number | null;
  /** Participações societárias em outras empresas. */
  participacoesSocietarias: number | null;

  /** Data a que os dados se referem, quando o fornecedor informa. */
  posicaoEm: string | null;
};

export const LEITURA_VAZIA: LeituraBureau = {
  score: null,
  scoreMaximo: null,
  scoreFaixa: null,
  pendenciasFinanceiras: null,
  valorPendencias: null,
  protestos: null,
  valorProtestos: null,
  chequesSemFundo: null,
  dividaAtiva: null,
  valorDividaAtiva: null,
  falencia: null,
  recuperacaoJudicial: null,
  situacaoReceita: null,
  acoesJudiciais: null,
  valorAcoesJudiciais: null,
  faturamentoPresumido: null,
  limiteCreditoSugerido: null,
  consultasUltimos90Dias: null,
  participacoesSocietarias: null,
  posicaoEm: null,
};

/** Contrato que todo adaptador de bureau precisa cumprir. */
export type AdaptadorBureau = {
  nome: string;
  /** Está configurado no .env a ponto de poder consultar? */
  configurado(): boolean;
  /** Consulta e devolve a leitura traduzida, mais a resposta bruta. */
  consultar(documento: string, tipo: "PF" | "PJ"): Promise<{ leitura: LeituraBureau; bruto: unknown }>;
};

// ---------------------------------------------------------------------
// Ajudantes de leitura, usados pelos adaptadores
// ---------------------------------------------------------------------

/** Lê um número que pode vir como número, texto ou dentro de outro objeto. */
export function numeroDe(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string") {
    // Formatos brasileiros: "1.234,56" e "1234.56" convivem nas respostas.
    const limpo = valor.replace(/[R$\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
    const n = Number(limpo);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function booleanoDe(valor: unknown): boolean | null {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "string") {
    const v = valor.trim().toUpperCase();
    if (["S", "SIM", "TRUE", "Y", "YES"].includes(v)) return true;
    if (["N", "NAO", "NÃO", "FALSE", "NO"].includes(v)) return false;
  }
  if (typeof valor === "number") return valor > 0;
  return null;
}

export function textoDe(valor: unknown): string | null {
  if (typeof valor === "string" && valor.trim()) return valor.trim();
  if (typeof valor === "number") return String(valor);
  return null;
}

/**
 * Busca um caminho dentro do objeto de resposta, aceitando vários caminhos
 * alternativos. Fornecedor muda nome de campo entre versões da API, e o
 * adaptador não pode quebrar por causa disso.
 */
export function buscar(objeto: unknown, ...caminhos: string[]): unknown {
  for (const caminho of caminhos) {
    let atual: unknown = objeto;
    let achou = true;

    for (const parte of caminho.split(".")) {
      if (atual == null || typeof atual !== "object") {
        achou = false;
        break;
      }
      atual = (atual as Record<string, unknown>)[parte];
    }

    if (achou && atual != null) return atual;
  }
  return null;
}

/** Conta itens de uma lista, venha ela como array ou como total já somado. */
export function contarDe(valor: unknown): number | null {
  if (Array.isArray(valor)) return valor.length;
  return numeroDe(valor);
}
