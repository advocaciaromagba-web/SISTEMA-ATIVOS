/**
 * Acompanhamento da vigência da MP nº 1.376/2026.
 *
 * Medida Provisória não é lei permanente: vale 60 dias, prorrogáveis por mais
 * 60 (CF, art. 62, §§ 3º e 7º), e termina de um destes jeitos — convertida em
 * lei (às vezes com texto ALTERADO por Projeto de Lei de Conversão), rejeitada,
 * ou perdendo eficácia. O motor de enquadramento em `mp1376.ts` foi escrito
 * sobre o texto ORIGINAL. Se a MP mudar de estado, aquele motor precisa ser
 * relido por gente — e é isso que este arquivo existe para avisar.
 *
 * REGRA DA CASA: nada aqui é inventado nem inferido por IA. O estado vem da
 * API de Dados Abertos da Câmara dos Deputados, que é fonte oficial, e o
 * vocabulário reconhecido abaixo ("Prorrogação de Prazo", "Perdeu a Eficácia",
 * "Transformado em Norma Jurídica", "Projeto de Lei de Conversão") foi
 * conferido em tramitações reais de MPs já encerradas, não suposto.
 *
 * E o sistema NUNCA desliga sozinho o motor de enquadramento: ele sinaliza,
 * mostra a fonte e o despacho literal, e deixa a decisão com o advogado.
 */

const API = "https://dadosabertos.camara.leg.br/api/v2";
const TEMPO_LIMITE = 20_000;

/** A MP que esta solução acompanha. */
export const MP_ACOMPANHADA = {
  chave: "MPV-1376-2026",
  sigla: "MPV",
  numero: 1376,
  ano: 2026,
  rotulo: "MP nº 1.376, de 15 de julho de 2026",
  publicacao: "2026-07-15",
} as const;

export type SituacaoMp =
  | "EM_TRAMITACAO"
  | "PRORROGADA"
  | "CONVERTIDA_EM_LEI"
  | "PERDEU_EFICACIA"
  | "REJEITADA_OU_ARQUIVADA"
  | "INDETERMINADO";

export type EventoTramitacao = {
  sequencia: number | null;
  data: string | null;
  orgao: string | null;
  descricao: string | null;
  situacao: string | null;
  despacho: string | null;
};

export type VigenciaMp = {
  chave: string;
  idProposicao: number | null;
  situacao: SituacaoMp;
  /** Texto oficial da situação, como a Câmara publica. Sem tradução nossa. */
  descricaoSituacaoOficial: string | null;
  /** Data-limite de deliberação. Vinda do despacho oficial quando houver. */
  prazoFinal: string | null;
  /** De onde saiu o prazo: despacho oficial de prorrogação, ou conta de 60 dias. */
  origemPrazo: "DESPACHO_OFICIAL" | "CALCULADO_60_DIAS" | "DESCONHECIDA";
  /** Preenchido só quando a MP virou lei. */
  leiConversao: string | null;
  /** Houve Projeto de Lei de Conversão: o texto pode ter mudado. */
  temProjetoLeiConversao: boolean;
  ultimoEvento: EventoTramitacao | null;
  /** O motor de `mp1376.ts` deixou de refletir com certeza a norma vigente. */
  exigeRevisaoDoMotor: boolean;
  alertas: { gravidade: "CRITICO" | "ATENCAO" | "INFORMATIVO"; titulo: string; texto: string }[];
  fonte: string;
  conferidoEm: string;
};

// ---------------------------------------------------------------------
// Leitura da fonte oficial
// ---------------------------------------------------------------------

type Proposicao = {
  id: number;
  statusProposicao?: { descricaoSituacao?: string | null; codSituacao?: number | null } | null;
};

async function buscarJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TEMPO_LIMITE),
      cache: "no-store",
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/** Identificação de uma MP na fonte oficial. Parametrizado para ser testável contra MPs já encerradas. */
export type AlvoMp = { sigla: string; numero: number; ano: number; publicacao: string };

/** Descobre o id da proposição pelo número/ano, em vez de deixá-lo fixo no código. */
async function acharProposicao(alvo: AlvoMp): Promise<Proposicao | null> {
  const lista = await buscarJson<{ dados: { id: number }[] }>(
    `${API}/proposicoes?siglaTipo=${alvo.sigla}&numero=${alvo.numero}&ano=${alvo.ano}`
  );
  const id = lista?.dados?.[0]?.id;
  if (!id) return null;
  const det = await buscarJson<{ dados: Proposicao }>(`${API}/proposicoes/${id}`);
  return det?.dados ?? { id };
}

async function buscarTramitacoes(id: number): Promise<EventoTramitacao[]> {
  const r = await buscarJson<{
    dados: {
      sequencia?: number | null;
      dataHora?: string | null;
      siglaOrgao?: string | null;
      descricaoTramitacao?: string | null;
      descricaoSituacao?: string | null;
      despacho?: string | null;
    }[];
  }>(`${API}/proposicoes/${id}/tramitacoes`);

  return (r?.dados ?? []).map((t) => ({
    sequencia: t.sequencia ?? null,
    data: t.dataHora ? t.dataHora.slice(0, 10) : null,
    orgao: t.siglaOrgao ?? null,
    descricao: t.descricaoTramitacao ?? null,
    situacao: t.descricaoSituacao ?? null,
    despacho: t.despacho ? t.despacho.replace(/\s+/g, " ").trim() : null,
  }));
}

// ---------------------------------------------------------------------
// Leitura determinística dos despachos
// ---------------------------------------------------------------------

/** "Data final após prorrogação: 02/06/2026" e também "2/6/2026". */
function lerPrazoProrrogado(eventos: EventoTramitacao[]): string | null {
  let maisRecente: string | null = null;
  for (const e of eventos) {
    const texto = `${e.descricao ?? ""} ${e.despacho ?? ""}`;
    const m = texto.match(/Data final ap[óo]s prorroga[çc][ãa]o:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    if (!m) continue;
    const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    if (!maisRecente || iso > maisRecente) maisRecente = iso;
  }
  return maisRecente;
}

/** "Transformado na Lei Ordinária 15164/2025." */
function lerLeiConversao(eventos: EventoTramitacao[]): string | null {
  for (const e of [...eventos].reverse()) {
    const m = (e.despacho ?? "").match(/Transformad[oa] na Lei\s+(Ordin[áa]ria|Complementar)?\s*n?[º°]?\s*([\d.]+)\s*\/\s*(\d{4})/i);
    if (m) {
      const especie = (m[1] ?? "").toLowerCase().startsWith("compl") ? "Lei Complementar" : "Lei";
      return `${especie} nº ${m[2]}/${m[3]}`;
    }
  }
  return null;
}

function temPlv(eventos: EventoTramitacao[]): boolean {
  return eventos.some((e) => /Projeto de Lei de Convers[ãa]o|\bPLV\b/i.test(`${e.descricao ?? ""} ${e.despacho ?? ""}`));
}

/**
 * Classifica a situação a partir do texto oficial.
 *
 * Os rótulos vêm da tabela de situações da própria Câmara
 * (`/referencias/situacoesProposicao`): "Transformado em Norma Jurídica",
 * "Perdeu a Eficácia", "Arquivada", "Rejeitada", "Vetado totalmente".
 */
function classificar(descricaoOficial: string | null, eventos: EventoTramitacao[]): SituacaoMp {
  const texto = (descricaoOficial ?? "").toLowerCase();
  const ultimos = eventos.map((e) => (e.descricao ?? "").toLowerCase());

  if (texto.includes("norma jurídica") || texto.includes("norma juridica")) return "CONVERTIDA_EM_LEI";
  if (texto.includes("eficácia") || texto.includes("eficacia")) return "PERDEU_EFICACIA";
  if (texto.includes("rejeitad") || texto.includes("arquivad") || texto.includes("prejudicial") || texto.includes("vetado total")) {
    return "REJEITADA_OU_ARQUIVADA";
  }

  // Situação ainda em branco é o normal enquanto a MP tramita: aí o estado
  // vem do último evento relevante.
  if (ultimos.some((d) => d.includes("norma jurídica") || d.includes("norma juridica"))) return "CONVERTIDA_EM_LEI";
  if (ultimos.some((d) => d.includes("perda de eficácia") || d.includes("perda de eficacia"))) return "PERDEU_EFICACIA";
  if (ultimos.some((d) => d.includes("prorrogação de prazo") || d.includes("prorrogacao de prazo"))) return "PRORROGADA";
  if (eventos.length > 0) return "EM_TRAMITACAO";
  return "INDETERMINADO";
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00-03:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function dataBr(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function diasAte(iso: string | null, hoje = new Date()): number | null {
  if (!iso) return null;
  const alvo = new Date(`${iso}T12:00:00-03:00`).getTime();
  const base = new Date(`${hoje.toISOString().slice(0, 10)}T12:00:00-03:00`).getTime();
  return Math.round((alvo - base) / 86_400_000);
}

// ---------------------------------------------------------------------
// Consulta pronta
// ---------------------------------------------------------------------

export async function consultarVigenciaMp(hoje = new Date(), alvo: AlvoMp = MP_ACOMPANHADA): Promise<VigenciaMp | null> {
  const prop = await acharProposicao(alvo);
  if (!prop) return null;

  const eventos = await buscarTramitacoes(prop.id);
  const descricaoOficial = prop.statusProposicao?.descricaoSituacao ?? null;
  const situacao = classificar(descricaoOficial, eventos);

  const prazoOficial = lerPrazoProrrogado(eventos);
  // Sem despacho oficial, a data é a mais CEDO possível: 60 dias contando a
  // publicação como dia 1, sem descontar a suspensão no recesso (CF, art. 62,
  // § 4º), que só empurra o prazo para frente. Errar para o lado de avisar
  // cedo demais é seguro; para o lado de avisar tarde, não.
  const prazoFinal = prazoOficial ?? somarDias(alvo.publicacao, 59);
  const origemPrazo: VigenciaMp["origemPrazo"] = prazoOficial ? "DESPACHO_OFICIAL" : "CALCULADO_60_DIAS";

  const leiConversao = lerLeiConversao(eventos);
  const plv = temPlv(eventos);
  const ultimoEvento = eventos.length > 0 ? eventos[eventos.length - 1] : null;

  const alertas: VigenciaMp["alertas"] = [];
  let exigeRevisaoDoMotor = false;

  if (situacao === "CONVERTIDA_EM_LEI") {
    exigeRevisaoDoMotor = true;
    alertas.push({
      gravidade: "CRITICO",
      titulo: `MP convertida em lei${leiConversao ? ` — ${leiConversao}` : ""}`,
      texto:
        "A análise de enquadramento deste sistema foi escrita sobre o texto ORIGINAL da medida provisória. " +
        "O Congresso pode ter alterado limites, taxas, prazos ou requisitos na conversão. " +
        "Confira o texto da lei publicada antes de usar o parecer em caso novo, e não reaproveite parecer antigo sem reler.",
    });
  }

  if (situacao === "PERDEU_EFICACIA" || situacao === "REJEITADA_OU_ARQUIVADA") {
    exigeRevisaoDoMotor = true;
    alertas.push({
      gravidade: "CRITICO",
      titulo: situacao === "PERDEU_EFICACIA" ? "MP perdeu a eficácia" : "MP rejeitada ou arquivada",
      texto:
        "A MP deixou de produzir efeitos para o futuro. As relações constituídas durante a vigência dependem de decreto " +
        "legislativo do Congresso e, na falta dele, permanecem regidas pela MP (CF, art. 62, § 11). " +
        "Não use esta linha de composição de dívidas em caso novo sem antes verificar o que restou. " +
        "A tese principal do alongamento (Súmula 298/STJ e MCR 2-6-4) NÃO depende desta MP e continua de pé.",
    });
  }

  if (plv && situacao !== "CONVERTIDA_EM_LEI") {
    alertas.push({
      gravidade: "ATENCAO",
      titulo: "Há Projeto de Lei de Conversão em curso",
      texto:
        "Apresentado PLV: o texto que vier a ser aprovado pode ser diferente do texto original da MP, " +
        "inclusive nos limites de crédito, taxas e prazos que este sistema aplica. Acompanhe até a sanção.",
    });
  }

  const dias = diasAte(prazoFinal, hoje);
  if ((situacao === "EM_TRAMITACAO" || situacao === "PRORROGADA") && dias !== null) {
    if (dias < 0) {
      alertas.push({
        gravidade: "CRITICO",
        titulo: "Prazo de deliberação vencido sem desfecho registrado",
        texto:
          `A data-limite conhecida (${dataBr(prazoFinal)}) já passou e a fonte oficial ainda não registra conversão, ` +
          "prorrogação ou perda de eficácia. Pode ser atraso de publicação da tramitação. Confira no Congresso antes de emitir parecer novo.",
      });
      exigeRevisaoDoMotor = true;
    } else if (dias <= 15) {
      alertas.push({
        gravidade: "ATENCAO",
        titulo: `Faltam ${dias} dia(s) para o fim do prazo de deliberação`,
        texto:
          `Data-limite conhecida: ${dataBr(prazoFinal)}. A MP pode ser convertida (com ou sem alteração de texto), prorrogada por mais 60 dias ` +
          "ou perder eficácia. Reveja os pareceres em aberto que dependem dela.",
      });
    }
  }

  if (origemPrazo === "CALCULADO_60_DIAS") {
    alertas.push({
      gravidade: "INFORMATIVO",
      titulo: "Data-limite é estimativa, não despacho oficial",
      texto:
        "Ainda não há despacho de prorrogação publicado. A data mostrada é a conta simples de 60 dias da publicação " +
        "(CF, art. 62, § 3º) e não desconta a suspensão da contagem durante recesso do Congresso (§ 4º), que só " +
        "empurra o prazo para frente — ou seja, é a data mais cedo possível, não a provável. " +
        "Quando sair despacho oficial, esta data passa a vir dele.",
    });
  }

  return {
    chave: `${alvo.sigla}-${alvo.numero}-${alvo.ano}`,
    idProposicao: prop.id,
    situacao,
    descricaoSituacaoOficial: descricaoOficial,
    prazoFinal,
    origemPrazo,
    leiConversao,
    temProjetoLeiConversao: plv,
    ultimoEvento,
    exigeRevisaoDoMotor,
    alertas,
    fonte: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${prop.id}`,
    conferidoEm: new Date().toISOString(),
  };
}

/**
 * Frase de advertência para dentro da peça, quando a MP não está mais em
 * tramitação normal. Devolve `null` quando não há o que advertir — assim a
 * minuta não ganha aviso decorativo, que é aviso que ninguém lê.
 */
export function avisoParaPeca(v: VigenciaMp | null): string | null {
  if (!v) return null;

  if (v.situacao === "CONVERTIDA_EM_LEI") {
    return (
      `esta seção foi redigida sobre o texto ORIGINAL da ${MP_ACOMPANHADA.rotulo}, que já foi convertida` +
      `${v.leiConversao ? ` na ${v.leiConversao}` : " em lei"}. ` +
      "O Congresso pode ter alterado limites, taxas, prazos e requisitos na conversão. " +
      "Confira o texto publicado e corrija a citação antes de protocolar."
    );
  }

  if (v.situacao === "PERDEU_EFICACIA" || v.situacao === "REJEITADA_OU_ARQUIVADA") {
    return (
      `${MP_ACOMPANHADA.rotulo} ` +
      (v.situacao === "PERDEU_EFICACIA" ? "perdeu a eficácia" : "foi rejeitada ou arquivada") +
      ". Avalie se convém manter este pedido subsidiário, e observe que as relações constituídas durante a vigência " +
      "seguem regidas pela MP na falta de decreto legislativo (CF, art. 62, § 11). " +
      "A tese principal do alongamento (Súmula 298/STJ e MCR 2-6-4) não depende desta MP."
    );
  }

  if (v.temProjetoLeiConversao) {
    return (
      `há Projeto de Lei de Conversão em curso sobre a ${MP_ACOMPANHADA.rotulo}: o texto final pode divergir do original ` +
      "citado aqui, inclusive em limites, taxas e prazos. Confira a versão vigente na data do protocolo."
    );
  }

  return null;
}

/**
 * FONTE: Câmara dos Deputados — API de Dados Abertos v2
 * (dadosabertos.camara.leg.br), endpoints /proposicoes, /proposicoes/{id},
 * /proposicoes/{id}/tramitacoes e /referencias/situacoesProposicao.
 *
 * Base constitucional dos prazos: CF, art. 62, §§ 3º, 4º, 7º e 11 —
 * 60 dias prorrogáveis por 60, contagem suspensa no recesso, e relações
 * jurídicas constituídas durante a vigência preservadas na falta de decreto
 * legislativo.
 */
