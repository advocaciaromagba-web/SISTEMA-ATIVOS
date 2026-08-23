/**
 * Índices oficiais, direto do Banco Central.
 *
 * Vêm da API pública de séries temporais (SGS), gratuita e sem chave. Não há
 * índice digitado à mão em lugar nenhum deste sistema: um número de correção
 * errado contamina o cálculo inteiro e ninguém percebe.
 *
 * As séries ficam guardadas na memória do servidor por algumas horas — elas
 * mudam uma vez por mês, e baixar a série inteira a cada cálculo seria lento
 * sem ganho nenhum.
 */

const BASE = "https://api.bcb.gov.br/dados/serie";
const TEMPO_LIMITE = 20000;
const VALIDADE_CACHE = 6 * 60 * 60 * 1000; // 6 horas

/** Códigos das séries no SGS do Banco Central. */
export const SERIES = {
  /** Selic acumulada no mês, em % ao mês. */
  SELIC: 4390,
  /** IPCA-E — é o índice que o STF fixou para débitos da Fazenda até a EC 113. */
  IPCA_E: 10764,
  /** IPCA cheio, para comparação. */
  IPCA: 433,
} as const;

export type PontoSerie = { ano: number; mes: number; percentual: number };

const cache = new Map<number, { pontos: PontoSerie[]; em: number }>();

/**
 * Baixa uma série mensal e devolve os pontos ordenados.
 * A API do Banco Central entrega no formato { data: "01/08/2026", valor: "0.78" }.
 */
export async function carregarSerie(codigo: number, desde = "01/01/1995"): Promise<PontoSerie[]> {
  const guardado = cache.get(codigo);
  if (guardado && Date.now() - guardado.em < VALIDADE_CACHE) return guardado.pontos;

  const url = `${BASE}/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${desde}`;
  const resposta = await fetch(url, { signal: AbortSignal.timeout(TEMPO_LIMITE) });

  if (!resposta.ok) throw new Error(`Banco Central respondeu HTTP ${resposta.status} para a série ${codigo}`);

  const bruto = (await resposta.json()) as Array<{ data: string; valor: string }>;

  const pontos = bruto
    .map((p) => {
      const [dia, mes, ano] = p.data.split("/").map(Number);
      void dia;
      return { ano, mes, percentual: Number(p.valor.replace(",", ".")) };
    })
    .filter((p) => Number.isFinite(p.percentual) && Number.isFinite(p.ano))
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes);

  cache.set(codigo, { pontos, em: Date.now() });
  return pontos;
}

/** Índice de um mês específico. */
export function percentualDoMes(pontos: PontoSerie[], ano: number, mes: number): number | null {
  const achado = pontos.find((p) => p.ano === ano && p.mes === mes);
  return achado ? achado.percentual : null;
}

/** Último mês disponível na série. */
export function ultimoMes(pontos: PontoSerie[]): { ano: number; mes: number } | null {
  const ultimo = pontos[pontos.length - 1];
  return ultimo ? { ano: ultimo.ano, mes: ultimo.mes } : null;
}

/**
 * Constrói uma data a partir de "AAAA-MM-DD" sempre no mesmo fuso.
 *
 * Existe porque `new Date("2018-06-01")` é meia-noite UTC, e ler o mês dela com
 * getMonth() no horário de Brasília devolve MAIO. Num cálculo de correção isso
 * é um mês inteiro de índice a mais — o tipo de erro que ninguém confere.
 * Todo o cálculo trabalha em UTC, de ponta a ponta.
 */
export function dataDeTexto(texto: string): Date {
  return new Date(`${texto.slice(0, 10)}T00:00:00Z`);
}

/** Ano e mês de uma data, sempre em UTC. */
export function mesDe(data: Date): { ano: number; mes: number } {
  return { ano: data.getUTCFullYear(), mes: data.getUTCMonth() + 1 };
}

/** Percorre mês a mês de uma data a outra, inclusive. */
export function mesesEntre(inicio: Date, fim: Date): Array<{ ano: number; mes: number }> {
  const meses: Array<{ ano: number; mes: number }> = [];

  let ano = inicio.getUTCFullYear();
  let mes = inicio.getUTCMonth() + 1;

  const anoFim = fim.getUTCFullYear();
  const mesFim = fim.getUTCMonth() + 1;

  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    meses.push({ ano, mes });
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }

  return meses;
}

export function nomeDoMes(mes: number): string {
  return [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ][mes - 1] ?? String(mes);
}
