/**
 * Consulta à taxa média de juros do crédito rural, direto na API de Séries
 * Temporais (SGS) do Banco Central — nunca estimada ou lembrada de memória.
 *
 * Séries conferidas ao vivo em 09/09/2026 (api.bcb.gov.br):
 *  - 20770: Taxa média de juros das operações de crédito com recursos
 *    direcionados — Pessoas físicas — Crédito rural com taxas reguladas.
 *  - 20759: Taxa média de juros das operações de crédito com recursos
 *    direcionados — Pessoas jurídicas — Crédito rural com taxas reguladas.
 */

export type TaxaMediaBcb = {
  valor: number;
  serie: number;
  nomeSerie: string;
  /** Mês/ano do dado mais recente publicado pelo Banco Central, no formato que a própria API devolve (DD/MM/AAAA). */
  periodoReferencia: string;
  dataConsulta: string;
  fonte: string;
};

const SERIE_PESSOA_FISICA = 20770;
const SERIE_PESSOA_JURIDICA = 20759;

const NOME_SERIE_PESSOA_FISICA =
  "Taxa média de juros das operações de crédito com recursos direcionados — Pessoas físicas — Crédito rural com taxas reguladas";
const NOME_SERIE_PESSOA_JURIDICA =
  "Taxa média de juros das operações de crédito com recursos direcionados — Pessoas jurídicas — Crédito rural com taxas reguladas";

/**
 * Devolve `null` em qualquer falha (rede fora, formato inesperado) — quem
 * chama trata a ausência de dado como "não foi possível comparar agora",
 * nunca como "taxa zero" ou qualquer outro valor inventado.
 */
export async function buscarTaxaMediaBcbRural(pessoaJuridica: boolean): Promise<TaxaMediaBcb | null> {
  const serie = pessoaJuridica ? SERIE_PESSOA_JURIDICA : SERIE_PESSOA_FISICA;
  const nomeSerie = pessoaJuridica ? NOME_SERIE_PESSOA_JURIDICA : NOME_SERIE_PESSOA_FISICA;

  try {
    const resposta = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/1?formato=json`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as Array<{ data?: string; valor?: string }>;
    const ultimo = dados[0];
    if (!ultimo?.valor || !ultimo.data) return null;

    const valor = Number(ultimo.valor.replace(",", "."));
    if (!Number.isFinite(valor)) return null;

    return {
      valor,
      serie,
      nomeSerie,
      periodoReferencia: ultimo.data,
      dataConsulta: new Date().toISOString(),
      fonte: `Banco Central do Brasil, Sistema Gerenciador de Séries Temporais (SGS), série ${serie} — ${nomeSerie}`,
    };
  } catch {
    return null;
  }
}
