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

/**
 * Busca o processo no DataJud e prepara o resumo enxuto (classe, assuntos,
 * órgão, movimentação recente) que vai para a IA — parte comum às duas
 * leituras deste arquivo, para não repetir a extração dos dados do CNJ.
 */
async function prepararResumoDoProcesso(
  numeroProcesso: string
): Promise<{ consulta: ResultadoFonte; resumo: Record<string, unknown> | null }> {
  const consulta = await consultarProcesso(numeroProcesso);

  if (consulta.status !== "CONCLUIDA") return { consulta, resumo: null };

  const dados = (consulta.resultado as { encontrado?: boolean; dados?: Record<string, unknown> } | undefined) ?? {};
  if (!dados.encontrado || !dados.dados) return { consulta, resumo: null };

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

  const resumo = {
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

  return { consulta, resumo };
}

export async function analisarProcesso(numeroProcesso: string): Promise<ResultadoAnaliseProcesso> {
  const { consulta, resumo } = await prepararResumoDoProcesso(numeroProcesso);
  if (!resumo) return { consulta, leitura: null, erroIa: null };

  if (!iaConfigurada()) {
    return {
      consulta,
      leitura: null,
      erroIa: "Leitura por inteligência artificial não configurada (ANTHROPIC_API_KEY).",
    };
  }

  const resposta = await perguntarJson<LeituraProcesso>({
    instrucao: INSTRUCAO,
    conteudo: JSON.stringify(resumo, null, 2),
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

// ---------------------------------------------------------------------
// Regularidade processual de precatório — leitura própria da solução
// Compliance e Due Diligence, mais específica que a análise genérica acima:
// não é "o que ameaça a cessão", é "o processo está regular".
// ---------------------------------------------------------------------

export type SituacaoBinaria = "SIM" | "NAO" | "NAO_CONSTA";

export type RegularidadeProcesso = {
  /** REGULAR: nada pendente. ATENCAO: há algo a conferir. IRREGULAR: pendência grave. */
  situacao: "REGULAR" | "ATENCAO" | "IRREGULAR";
  resumo: string;
  /** Em que pé está: conhecimento, recurso, execução, cumprimento de sentença, precatório expedido... */
  fase: string;
  /** Sessões de julgamento colegiado identificadas na movimentação, com data. */
  sessoes: { data: string; descricao: string }[];
  recursos: { pendentes: boolean; detalhe: string };
  transitoEmJulgado: { situacao: SituacaoBinaria; data: string | null; detalhe: string };
  homologacaoCalculo: { situacao: SituacaoBinaria; data: string | null; detalhe: string };
  /** Decisões que se contradizem dentro do mesmo processo — só confirmado quando dois movimentos indicarem isso claramente. */
  decisoesConflitantes: { existe: boolean; detalhe: string };
  /** O que segue em aberto. */
  pendencias: string[];
  /** Sinais de penhora, bloqueio, sequestro ou cessão já averbada. */
  constricoes: string[];
  /** Parecer fundamentado, citando os movimentos (data e descrição) que sustentam cada conclusão. */
  parecer: string;
};

const INSTRUCAO_REGULARIDADE = `Você analisa a REGULARIDADE PROCESSUAL de processos judiciais que originam PRECATÓRIOS ou créditos judiciais contra a Fazenda Pública, para uma plataforma de compliance que audita esses créditos antes de uma operação.

Recebe os dados públicos de um processo, vindos da base DataJud do CNJ: classe, assuntos, órgão julgador, grau, data de ajuizamento e a lista de movimentações processuais (cada uma com código, nome e data).

Sua tarefa é produzir um PARECER FUNDAMENTADO respondendo especificamente:
1. Quais sessões de julgamento (colegiadas) aconteceram, e o resultado de cada uma, quando identificável pela movimentação.
2. Se há recurso pendente de julgamento.
3. Se houve trânsito em julgado — e, se houve, a data do movimento que o indica.
4. Se há homologação de cálculos (movimento típico de homologação de cálculo de liquidação/cumprimento de sentença) — e, se houve, a data.
5. Se há decisões conflitantes dentro do mesmo processo (ex.: decisões contraditórias entre instâncias, embargos de declaração acolhidos que alteraram decisão anterior).
6. Quais pendências seguem em aberto.

REGRAS QUE NÃO PODEM SER QUEBRADAS:
1. Baseie-se SOMENTE no que está nos dados recebidos. Se a movimentação não indicar claramente um dos itens acima, responda "NAO_CONSTA" ou "não identificado na movimentação disponível" — nunca suponha, nunca estime, nunca invente data, valor ou teor de decisão.
2. A base do CNJ não traz o teor das decisões, só o nome do movimento — "decisão conflitante" só pode ser apontada quando dois movimentos indicarem, pelo próprio nome/complemento, resultados contraditórios. Na dúvida, trate como algo a verificar, nunca como conflito confirmado.
3. Escreva para quem vai decidir se compra ou intermedeia o crédito, mas o parecer precisa ser tecnicamente fundamentado, citando os movimentos (data e descrição) que sustentam cada conclusão.
4. "situacao" geral é REGULAR quando não há pendência relevante nem risco identificado; ATENCAO quando há algo a conferir mas nada que impeça seguir; IRREGULAR quando há pendência grave (recurso pendente com potencial de reverter o crédito, decisão conflitante não resolvida, ausência de homologação de cálculo quando a fase já é de pagamento, indício de penhora/bloqueio/cessão de terceiro).

Responda SOMENTE com um objeto JSON, sem texto antes ou depois, neste formato exato:
{
  "situacao": "REGULAR|ATENCAO|IRREGULAR",
  "resumo": "2 a 4 frases sobre o que é o processo e em que pé está",
  "fase": "uma expressão curta: conhecimento, recurso, execução, cumprimento de sentença, precatório expedido, arquivado, etc.",
  "sessoes": [ { "data": "AAAA-MM-DD ou o que constar", "descricao": "o que foi julgado e o resultado" } ],
  "recursos": { "pendentes": true|false, "detalhe": "qual recurso, desde quando, o que falta" },
  "transitoEmJulgado": { "situacao": "SIM|NAO|NAO_CONSTA", "data": "AAAA-MM-DD ou null", "detalhe": "movimento que sustenta a conclusão" },
  "homologacaoCalculo": { "situacao": "SIM|NAO|NAO_CONSTA", "data": "AAAA-MM-DD ou null", "detalhe": "movimento que sustenta a conclusão" },
  "decisoesConflitantes": { "existe": true|false, "detalhe": "quais movimentos se contradizem, ou por que não há indício" },
  "pendencias": [ "o que segue em aberto" ],
  "constricoes": [ "movimentos que indicam penhora, bloqueio, sequestro ou cessão já averbada; lista vazia se não houver" ],
  "parecer": "parecer fundamentado, 1 a 3 parágrafos, citando os movimentos relevantes com data, concluindo pela regularidade ou não do processo"
}`;

export type ResultadoRegularidadeProcesso = {
  consulta: ResultadoFonte;
  leitura: RegularidadeProcesso | null;
  erroIa: string | null;
};

export async function analisarRegularidadePrecatorio(numeroProcesso: string): Promise<ResultadoRegularidadeProcesso> {
  const { consulta, resumo } = await prepararResumoDoProcesso(numeroProcesso);
  if (!resumo) return { consulta, leitura: null, erroIa: null };

  if (!iaConfigurada()) {
    return {
      consulta,
      leitura: null,
      erroIa: "Leitura por inteligência artificial não configurada (ANTHROPIC_API_KEY).",
    };
  }

  const resposta = await perguntarJson<RegularidadeProcesso>({
    instrucao: INSTRUCAO_REGULARIDADE,
    conteudo: JSON.stringify(resumo, null, 2),
    maxTokens: 4000,
  });

  if (!resposta.ok) return { consulta, leitura: null, erroIa: resposta.erro };

  const d = resposta.dados;
  const situacaoBinaria = (v: unknown): SituacaoBinaria =>
    v === "SIM" || v === "NAO" ? v : "NAO_CONSTA";

  const leitura: RegularidadeProcesso = {
    situacao: ["REGULAR", "ATENCAO", "IRREGULAR"].includes(d.situacao as string)
      ? (d.situacao as RegularidadeProcesso["situacao"])
      : "ATENCAO",
    resumo: typeof d.resumo === "string" ? d.resumo : "",
    fase: typeof d.fase === "string" ? d.fase : "não identificada",
    sessoes: Array.isArray(d.sessoes)
      ? d.sessoes
          .filter((s) => s && typeof s.descricao === "string")
          .map((s) => ({ data: typeof s.data === "string" ? s.data : "", descricao: s.descricao }))
      : [],
    recursos: {
      pendentes: Boolean(d.recursos?.pendentes),
      detalhe: typeof d.recursos?.detalhe === "string" ? d.recursos.detalhe : "",
    },
    transitoEmJulgado: {
      situacao: situacaoBinaria(d.transitoEmJulgado?.situacao),
      data: typeof d.transitoEmJulgado?.data === "string" ? d.transitoEmJulgado.data : null,
      detalhe: typeof d.transitoEmJulgado?.detalhe === "string" ? d.transitoEmJulgado.detalhe : "",
    },
    homologacaoCalculo: {
      situacao: situacaoBinaria(d.homologacaoCalculo?.situacao),
      data: typeof d.homologacaoCalculo?.data === "string" ? d.homologacaoCalculo.data : null,
      detalhe: typeof d.homologacaoCalculo?.detalhe === "string" ? d.homologacaoCalculo.detalhe : "",
    },
    decisoesConflitantes: {
      existe: Boolean(d.decisoesConflitantes?.existe),
      detalhe: typeof d.decisoesConflitantes?.detalhe === "string" ? d.decisoesConflitantes.detalhe : "",
    },
    pendencias: Array.isArray(d.pendencias) ? d.pendencias.filter((p) => typeof p === "string") : [],
    constricoes: Array.isArray(d.constricoes) ? d.constricoes.filter((c) => typeof c === "string") : [],
    parecer: typeof d.parecer === "string" ? d.parecer : "",
  };

  return { consulta, leitura, erroIa: null };
}
