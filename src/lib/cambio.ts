/**
 * Cotação do dólar, para converter custo de IA (cobrado em dólar pela
 * Anthropic e pela OpenAI) para real, nas telas onde o administrador compara
 * custo de IA com o preço da assinatura (que é em real).
 *
 * A cotação vem ao vivo da PTAX do Banco Central (olinda.bcb.gov.br) — nunca
 * fixa no código, porque câmbio muda todo dia útil e um valor parado viraria
 * conta errada sem ninguém perceber. Fica em cache por algumas horas em
 * `ConfigAdmin` para não bater na API do Bacen a cada carregamento de tela;
 * se a busca ao vivo falhar, usa o último valor guardado (avisando que está
 * desatualizado) em vez de travar a tela.
 */
import { prisma } from "@/lib/prisma";

const CHAVE_VALOR = "cambio_usd_brl_valor";
const CHAVE_DATA_COTACAO = "cambio_usd_brl_data_cotacao";
const VALIDADE_HORAS = 6;

export type CotacaoDolar = {
  valor: number;
  /** Data (AAAA-MM-DD) do pregão a que a cotação se refere — o Bacen não cota em fins de semana/feriado. */
  dataCotacao: string;
  consultadoEm: Date;
  desatualizada: boolean;
  fonte: string;
};

const FONTE = "Banco Central do Brasil — PTAX, cotação de venda (olinda.bcb.gov.br)";

function formatarDataBcb(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${mes}-${dia}-${d.getFullYear()}`;
}

/**
 * Busca a cotação mais recente num período de 10 dias corridos — folga
 * suficiente para sempre cair num pregão, mesmo depois de feriado prolongado
 * (a PTAX só é publicada em dia útil).
 */
async function buscarAoVivo(): Promise<{ valor: number; dataCotacao: string } | null> {
  const hoje = new Date();
  const dezDiasAtras = new Date(hoje.getTime() - 10 * 86_400_000);
  const url =
    `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
    `?@dataInicial='${formatarDataBcb(dezDiasAtras)}'&@dataFinalCotacao='${formatarDataBcb(hoje)}'&$top=1&$orderby=dataHoraCotacao desc&$format=json`;

  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as { value?: Array<{ cotacaoVenda?: number; dataHoraCotacao?: string }> };
    const item = dados.value?.[0];
    if (!item?.cotacaoVenda || !item.dataHoraCotacao) return null;

    return { valor: item.cotacaoVenda, dataCotacao: item.dataHoraCotacao.slice(0, 10) };
  } catch {
    return null;
  }
}

/** Devolve `null` só quando nunca houve cotação nem em cache e a busca ao vivo falhou — quem chama trata isso como "conversão indisponível", nunca como câmbio 1:1 ou qualquer outro valor inventado. */
export async function cotacaoDolarComCache(): Promise<CotacaoDolar | null> {
  const [linhaValor, linhaData] = await Promise.all([
    prisma.configAdmin.findUnique({ where: { chave: CHAVE_VALOR } }),
    prisma.configAdmin.findUnique({ where: { chave: CHAVE_DATA_COTACAO } }),
  ]);

  const cacheValido = linhaValor && Date.now() - linhaValor.atualizadoEm.getTime() < VALIDADE_HORAS * 3_600_000;
  if (cacheValido) {
    return {
      valor: Number(linhaValor.valor),
      dataCotacao: linhaData?.valor ?? "",
      consultadoEm: linhaValor.atualizadoEm,
      desatualizada: false,
      fonte: FONTE,
    };
  }

  const fresca = await buscarAoVivo();
  if (fresca) {
    const agora = new Date();
    await Promise.all([
      prisma.configAdmin.upsert({
        where: { chave: CHAVE_VALOR },
        create: { chave: CHAVE_VALOR, valor: String(fresca.valor) },
        update: { valor: String(fresca.valor) },
      }),
      prisma.configAdmin.upsert({
        where: { chave: CHAVE_DATA_COTACAO },
        create: { chave: CHAVE_DATA_COTACAO, valor: fresca.dataCotacao },
        update: { valor: fresca.dataCotacao },
      }),
    ]);
    return { valor: fresca.valor, dataCotacao: fresca.dataCotacao, consultadoEm: agora, desatualizada: false, fonte: FONTE };
  }

  // Busca ao vivo falhou: cai para o que tiver em cache, mesmo vencido, em
  // vez de deixar a tela sem número. Se nunca houve cache, devolve null.
  if (linhaValor) {
    return {
      valor: Number(linhaValor.valor),
      dataCotacao: linhaData?.valor ?? "",
      consultadoEm: linhaValor.atualizadoEm,
      desatualizada: true,
      fonte: FONTE,
    };
  }

  return null;
}
