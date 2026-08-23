/**
 * Bureau de crédito — a fonte que responde de verdade sobre capacidade de
 * pagamento: protestos, negativações, pendências financeiras, cheques sem
 * fundo, participação societária e score.
 *
 * Nenhum bureau publica API aberta. Todos exigem contrato comercial com CNPJ e
 * cobram por consulta. Por isso este arquivo é um encaixe: enquanto não houver
 * contrato, ele se declara indisponível e a auditoria diz claramente o que
 * ficou sem verificar — em vez de dar por boa uma capacidade que ninguém mediu.
 *
 * Para ligar, preencha no .env:
 *   BUREAU_PROVEDOR   nome do fornecedor (serasa, assertiva, bigdatacorp, directdata)
 *   BUREAU_API_URL    endereço do endpoint de consulta
 *   BUREAU_API_KEY    chave fornecida no contrato
 *
 * O formato de resposta muda de fornecedor para fornecedor. A função
 * `interpretar` abaixo é o único ponto a ajustar quando o contrato for fechado.
 */
import type { Apontamento, ResultadoFonte } from "../tipos";
import { moeda } from "@/lib/formato";

const TEMPO_LIMITE = 20000;

export type LeituraBureau = {
  /** Pontuação de crédito do fornecedor, quando houver (0 a 1000). */
  score: number | null;
  protestos: number | null;
  valorProtestos: number | null;
  negativacoes: number | null;
  valorNegativacoes: number | null;
  chequesSemFundo: number | null;
  falencia: boolean | null;
  recuperacaoJudicial: boolean | null;
};

function configurado(): { url: string; chave: string; provedor: string } | null {
  const url = (process.env.BUREAU_API_URL ?? "").trim();
  const chave = (process.env.BUREAU_API_KEY ?? "").trim();
  const provedor = (process.env.BUREAU_PROVEDOR ?? "").trim();
  if (!url || !chave) return null;
  return { url, chave, provedor: provedor || "bureau" };
}

/**
 * Traduz a resposta do fornecedor para a leitura que o sistema entende.
 * Ajuste aqui — e só aqui — ao fechar contrato com um bureau.
 */
function interpretar(bruto: Record<string, unknown>): LeituraBureau {
  const num = (chave: string): number | null => {
    const v = bruto[chave];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
    return null;
  };
  const bool = (chave: string): boolean | null =>
    typeof bruto[chave] === "boolean" ? (bruto[chave] as boolean) : null;

  return {
    score: num("score"),
    protestos: num("protestos"),
    valorProtestos: num("valorProtestos"),
    negativacoes: num("negativacoes"),
    valorNegativacoes: num("valorNegativacoes"),
    chequesSemFundo: num("chequesSemFundo"),
    falencia: bool("falencia"),
    recuperacaoJudicial: bool("recuperacaoJudicial"),
  };
}

function apontar(leitura: LeituraBureau, provedor: string): Apontamento[] {
  const apontamentos: Apontamento[] = [];
  const fonte = `Bureau de crédito (${provedor})`;

  if (leitura.falencia) {
    apontamentos.push({
      gravidade: "GRAVE",
      eixo: "IDONEIDADE",
      titulo: "Falência registrada",
      detalhe: "Há registro de falência. A parte não tem capacidade de contratar nos termos usuais.",
      fonte,
    });
  }

  if (leitura.recuperacaoJudicial) {
    apontamentos.push({
      gravidade: "GRAVE",
      eixo: "CAPACIDADE",
      titulo: "Em recuperação judicial",
      detalhe:
        "Empresa em recuperação judicial. Pagamentos ficam sujeitos ao plano aprovado, e a cessão pode " +
        "depender de autorização do juízo da recuperação.",
      fonte,
    });
  }

  if (leitura.protestos && leitura.protestos > 0) {
    apontamentos.push({
      gravidade: leitura.protestos >= 3 ? "GRAVE" : "MEDIA",
      eixo: "CAPACIDADE",
      titulo: `${leitura.protestos} protesto(s) em cartório`,
      detalhe:
        `Há ${leitura.protestos} protesto(s) registrado(s)` +
        (leitura.valorProtestos ? `, somando ${moeda(leitura.valorProtestos)}` : "") +
        ". Protesto é dívida vencida e não paga, reconhecida em cartório — o sinal mais direto de dificuldade " +
        "de pagamento.",
      fonte,
    });
  }

  if (leitura.negativacoes && leitura.negativacoes > 0) {
    apontamentos.push({
      gravidade: leitura.negativacoes >= 5 ? "GRAVE" : "MEDIA",
      eixo: "CAPACIDADE",
      titulo: `${leitura.negativacoes} negativação(ões)`,
      detalhe:
        `Registros de inadimplência` +
        (leitura.valorNegativacoes ? `, somando ${moeda(leitura.valorNegativacoes)}` : "") +
        ". Avalie se o valor devido é relevante diante do porte da parte.",
      fonte,
    });
  }

  if (leitura.chequesSemFundo && leitura.chequesSemFundo > 0) {
    apontamentos.push({
      gravidade: "MEDIA",
      eixo: "CAPACIDADE",
      titulo: `${leitura.chequesSemFundo} cheque(s) sem fundo`,
      detalhe: "Registro no Cadastro de Emitentes de Cheques sem Fundos (CCF) do Banco Central.",
      fonte,
    });
  }

  if (leitura.score != null && leitura.score < 300) {
    apontamentos.push({
      gravidade: "MEDIA",
      eixo: "CAPACIDADE",
      titulo: `Pontuação de crédito baixa (${leitura.score})`,
      detalhe:
        "A pontuação do bureau indica risco alto de inadimplência. Ela é estatística e não substitui a " +
        "análise dos números da operação, mas pesa na decisão de exigir garantia.",
      fonte,
    });
  }

  return apontamentos;
}

export async function consultarBureau(documento: string): Promise<ResultadoFonte & { leitura: LeituraBureau | null }> {
  const config = configurado();

  if (!config) {
    return {
      fonte: "BUREAU",
      status: "INDISPONIVEL",
      resumo: "Bureau de crédito não contratado — protestos e negativações não foram verificados.",
      apontamentos: [
        {
          gravidade: "MEDIA",
          eixo: "CAPACIDADE",
          titulo: "Restrições financeiras não verificadas",
          detalhe:
            "Sem contrato com um bureau de crédito, o sistema não consegue ver protestos, negativações, " +
            "cheques sem fundo nem recuperação judicial. A capacidade de pagamento foi estimada apenas pelo " +
            "cadastro da Receita, o que é indício, não prova. Enquanto não houver contrato, exija do " +
            "interessado as certidões de protesto e a certidão negativa de débitos.",
          fonte: "Bureau de crédito",
        },
      ],
      leitura: null,
    };
  }

  try {
    const resposta = await fetch(config.url.replace("{documento}", documento), {
      headers: { Authorization: `Bearer ${config.chave}`, Accept: "application/json" },
      signal: AbortSignal.timeout(TEMPO_LIMITE),
    });

    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const bruto = (await resposta.json()) as Record<string, unknown>;
    const leitura = interpretar(bruto);

    return {
      fonte: "BUREAU",
      status: "CONCLUIDA",
      resumo:
        leitura.protestos || leitura.negativacoes
          ? `${leitura.protestos ?? 0} protesto(s) e ${leitura.negativacoes ?? 0} negativação(ões).`
          : "Nenhuma restrição financeira encontrada.",
      resultado: { provedor: config.provedor, leitura, bruto },
      apontamentos: apontar(leitura, config.provedor),
      leitura,
    };
  } catch (erro) {
    return {
      fonte: "BUREAU",
      status: "ERRO",
      resumo: "Consulta ao bureau de crédito não concluída.",
      erro: (erro as Error).message,
      apontamentos: [],
      leitura: null,
    };
  }
}
