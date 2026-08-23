/**
 * Análise do processo de origem do crédito.
 *
 * O caminho é: número do processo → DataJud (CNJ) devolve classe, assunto,
 * órgão e toda a movimentação → a IA lê a movimentação e diz, em linguagem
 * simples, em que pé o processo está e o que ameaça a operação.
 *
 * O que o DataJud NÃO devolve, e que por isso não pode ser inventado aqui:
 *   - as partes do processo (removidas da base pública por privacidade);
 *   - o conteúdo das peças e decisões;
 *   - o ano orçamentário (LOA) do precatório, a ordem cronológica e as cessões
 *     já averbadas — isso vive no sistema de precatórios de cada tribunal e sai
 *     na certidão de situação do precatório.
 *
 * A IA lê apenas o que veio do CNJ. Se a movimentação não disser, a resposta é
 * "não consta na base", nunca uma suposição.
 */
import { perguntarJson, iaConfigurada } from "@/lib/ia/claude";
import { consultarProcesso } from "./fontes/datajud";
import { formatarNumeroProcessoCnj } from "@/lib/validacao";
import type { ResultadoFonte } from "./tipos";

export type RiscoProcesso = {
  gravidade: "GRAVE" | "MEDIA" | "BAIXA";
  titulo: string;
  detalhe: string;
};

export type LeituraProcesso = {
  /** Resumo do processo em linguagem de quem não é advogado. */
  resumo: string;
  /** Em que pé está: conhecimento, recurso, execução, precatório expedido... */
  fase: string;
  /** Data e descrição do último movimento relevante. */
  ultimoMovimento: string;
  /** O que ameaça a operação de cessão. */
  riscos: RiscoProcesso[];
  /** O que conferir a seguir, fora da base do CNJ. */
  verificar: string[];
  /** Sinais de penhora, bloqueio, sequestro ou cessão já averbada. */
  constricoes: string[];
};

const INSTRUCAO = `Você analisa processos judiciais brasileiros para uma plataforma de intermediação de ativos, especialmente cessão de precatórios e de créditos judiciais.

Recebe os dados públicos de um processo, vindos da base DataJud do CNJ: classe, assuntos, órgão julgador, grau, data de ajuizamento e a lista de movimentações processuais (cada uma com código, nome e data).

Sua tarefa é dizer, para quem vai COMPRAR o crédito desse processo, em que pé ele está e o que pode dar errado.

REGRAS QUE NÃO PODEM SER QUEBRADAS:
1. Baseie-se SOMENTE no que está nos dados recebidos. A base do CNJ não traz as partes, nem o conteúdo das decisões, nem valores. Se algo não está lá, escreva "não consta na base do CNJ" — nunca suponha, nunca estime, nunca invente número, valor, nome ou data.
2. Não afirme quem é o credor ou o devedor: essa informação não vem nesta base.
3. Movimentação processual é padronizada e às vezes ambígua. Quando a leitura for incerta, diga que é incerta.
4. Escreva para leigo: sem jargão desnecessário, frases curtas, e sempre dizendo o que aquilo significa na prática para quem vai pagar pelo crédito.
5. Preste atenção especial a movimentos que indiquem: penhora, arresto, sequestro, bloqueio, indisponibilidade, habilitação de terceiro, cessão de crédito, sucessão processual, suspensão, prescrição, extinção sem resolução de mérito, recurso pendente, precatório expedido, requisição de pequeno valor, compensação com débito tributário.

Responda SOMENTE com um objeto JSON, sem texto antes ou depois, neste formato exato:
{
  "resumo": "2 a 4 frases sobre o que é o processo e em que pé está",
  "fase": "uma expressão curta: conhecimento, recurso, execução, cumprimento de sentença, precatório expedido, arquivado, etc.",
  "ultimoMovimento": "data e descrição do último movimento relevante",
  "riscos": [ { "gravidade": "GRAVE|MEDIA|BAIXA", "titulo": "curto", "detalhe": "o que é e o que fazer" } ],
  "verificar": [ "itens a conferir fora da base do CNJ" ],
  "constricoes": [ "movimentos que indicam penhora, bloqueio, cessão ou habilitação de terceiro; lista vazia se não houver" ]
}`;

export type ResultadoAnaliseProcesso = {
  consulta: ResultadoFonte;
  leitura: LeituraProcesso | null;
  erroIa: string | null;
};

export async function analisarProcesso(numeroProcesso: string): Promise<ResultadoAnaliseProcesso> {
  const consulta = await consultarProcesso(numeroProcesso);

  if (consulta.status !== "CONCLUIDA") {
    return { consulta, leitura: null, erroIa: null };
  }

  const dados = (consulta.resultado as { encontrado?: boolean; dados?: Record<string, unknown> } | undefined) ?? {};
  if (!dados.encontrado || !dados.dados) {
    return { consulta, leitura: null, erroIa: null };
  }

  if (!iaConfigurada()) {
    return {
      consulta,
      leitura: null,
      erroIa: "Leitura por inteligência artificial não configurada (ANTHROPIC_API_KEY).",
    };
  }

  const fonte = dados.dados;

  // Movimentações vêm em ordem qualquer e podem ser centenas. Ordenamos por
  // data e mandamos as mais recentes, que é onde está o que importa.
  const movimentos = Array.isArray(fonte.movimentos)
    ? (fonte.movimentos as Array<Record<string, unknown>>)
        .map((m) => ({
          data: String(m.dataHora ?? ""),
          nome: String(m.nome ?? ""),
          complementos: Array.isArray(m.complementosTabelados)
            ? (m.complementosTabelados as Array<Record<string, unknown>>)
                .map((c) => String(c.nome ?? ""))
                .filter(Boolean)
                .join("; ")
            : "",
        }))
        .sort((a, b) => b.data.localeCompare(a.data))
        .slice(0, 120)
    : [];

  const resumoDoProcesso = {
    numero: formatarNumeroProcessoCnj(numeroProcesso),
    classe: (fonte.classe as { nome?: string } | undefined)?.nome ?? null,
    assuntos: Array.isArray(fonte.assuntos)
      ? (fonte.assuntos as Array<{ nome?: string }>).map((a) => a.nome).filter(Boolean)
      : [],
    orgaoJulgador: (fonte.orgaoJulgador as { nome?: string } | undefined)?.nome ?? null,
    grau: fonte.grau ?? null,
    dataAjuizamento: fonte.dataAjuizamento ?? null,
    tribunal: fonte.tribunal ?? null,
    totalMovimentos: Array.isArray(fonte.movimentos) ? fonte.movimentos.length : 0,
    movimentosRecentes: movimentos,
  };

  const resposta = await perguntarJson<LeituraProcesso>({
    instrucao: INSTRUCAO,
    conteudo: JSON.stringify(resumoDoProcesso, null, 2),
    maxTokens: 4000,
  });

  if (!resposta.ok) return { consulta, leitura: null, erroIa: resposta.erro };

  // Conferência de formato: modelo de linguagem erra estrutura, e uma tela que
  // espera lista não pode receber texto.
  const d = resposta.dados;
  const leitura: LeituraProcesso = {
    resumo: typeof d.resumo === "string" ? d.resumo : "",
    fase: typeof d.fase === "string" ? d.fase : "não identificada",
    ultimoMovimento: typeof d.ultimoMovimento === "string" ? d.ultimoMovimento : "",
    riscos: Array.isArray(d.riscos)
      ? d.riscos
          .filter((r) => r && typeof r.titulo === "string")
          .map((r) => ({
            gravidade: ["GRAVE", "MEDIA", "BAIXA"].includes(r.gravidade) ? r.gravidade : "MEDIA",
            titulo: r.titulo,
            detalhe: typeof r.detalhe === "string" ? r.detalhe : "",
          }))
      : [],
    verificar: Array.isArray(d.verificar) ? d.verificar.filter((v) => typeof v === "string") : [],
    constricoes: Array.isArray(d.constricoes) ? d.constricoes.filter((c) => typeof c === "string") : [],
  };

  return { consulta, leitura, erroIa: null };
}
