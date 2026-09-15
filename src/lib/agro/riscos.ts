/**
 * Consolidação de riscos e desequilíbrio contratual.
 *
 * Não é um motor de regra jurídica nova: cada achado aqui já foi produzido,
 * com fundamento próprio, por um dos outros motores desta solução — taxas
 * (`taxas.ts`), venda casada e tarifas (`cobrancas.ts`), garantias e
 * avalistas (`garantias.ts`), seguro rural (`seguro-rural.ts`), alongamento
 * (`alongamento.ts`) e o próprio enquadramento na MP 1.376 (`mp1376.ts`).
 * Reescrever essas regras aqui seria duplicar fundamento jurídico em dois
 * lugares, com o risco real de os dois lugares divergirem com o tempo.
 *
 * O que este módulo faz de próprio: reúne os alertas de TODOS eles num único
 * painel, prioriza por gravidade, e soma o que a pessoa escreveu à mão nos
 * campos de risco/desequilíbrio livres — para a tela de "riscos" do contrato
 * não ficar em branco só porque cada achado mora em outra aba.
 */

export type Gravidade = "CRITICO" | "ATENCAO" | "INFORMATIVO";
export type AlertaConsolidado = { gravidade: Gravidade; titulo: string; texto: string; fonte: string; origem: string };

export type ResultadoRiscos = {
  alertas: AlertaConsolidado[];
  totalCriticos: number;
  totalAtencao: number;
  /**
   * Classificação de triagem — não é juízo sobre o mérito do caso, só sobre
   * quantos e quão graves são os pontos já levantados pelos outros motores.
   */
  classificacao: "MULTIPLOS_INDICIOS_GRAVES" | "PONTOS_DE_ATENCAO" | "SEM_INDICIO_RELEVANTE";
};

type AlertaBase = { gravidade: Gravidade; titulo: string; texto: string; fonte: string };
type ItemChecklistBase = { requisito: string; artigo: string; atende: boolean | "INDETERMINADO"; observacao: string };

export function consolidarRiscos(params: {
  alertasTaxas?: AlertaBase[] | null;
  alertasCobrancas?: AlertaBase[] | null;
  alertasGarantias?: AlertaBase[] | null;
  alertasSeguroRural?: AlertaBase[] | null;
  alertasAlongamento?: AlertaBase[] | null;
  /** Itens do checklist da MP 1.376 que reprovaram (atende === false) viram risco; os demais, não. */
  checklistMp1376?: ItemChecklistBase[] | null;
  /** Texto livre já digitado no cadastro, para não desaparecer da consolidação. */
  riscosIdentificadosLivre?: string[] | null;
  desequilibrioContratualLivre?: string | null;
}): ResultadoRiscos {
  const alertas: AlertaConsolidado[] = [];

  const empilhar = (origem: string, lista?: AlertaBase[] | null) => {
    for (const a of lista ?? []) alertas.push({ ...a, origem });
  };

  empilhar("Taxas e encargos", params.alertasTaxas);
  empilhar("Venda casada e tarifas", params.alertasCobrancas);
  empilhar("Garantias e avalistas", params.alertasGarantias);
  empilhar("Seguro rural", params.alertasSeguroRural);
  empilhar("Alongamento (MCR 2-6-4)", params.alertasAlongamento);

  for (const item of params.checklistMp1376 ?? []) {
    if (item.atende !== false) continue; // só o que reprovou vira risco aqui
    alertas.push({
      gravidade: "ATENCAO",
      titulo: `Requisito da MP 1.376 não atendido: ${item.requisito}`,
      texto: item.observacao,
      fonte: item.artigo,
      origem: "Enquadramento MP 1.376",
    });
  }

  for (const texto of params.riscosIdentificadosLivre ?? []) {
    if (!texto?.trim()) continue;
    alertas.push({
      gravidade: "INFORMATIVO",
      titulo: "Risco anotado no cadastro",
      texto,
      fonte: "Anotação do usuário",
      origem: "Cadastro",
    });
  }

  if (params.desequilibrioContratualLivre?.trim()) {
    alertas.push({
      gravidade: "INFORMATIVO",
      titulo: "Desequilíbrio contratual anotado no cadastro",
      texto: params.desequilibrioContratualLivre,
      fonte: "Anotação do usuário",
      origem: "Cadastro",
    });
  }

  // Mais grave primeiro, para quem lê ir direto ao que decide o caso.
  const ordem: Record<Gravidade, number> = { CRITICO: 0, ATENCAO: 1, INFORMATIVO: 2 };
  alertas.sort((a, b) => ordem[a.gravidade] - ordem[b.gravidade]);

  const totalCriticos = alertas.filter((a) => a.gravidade === "CRITICO").length;
  const totalAtencao = alertas.filter((a) => a.gravidade === "ATENCAO").length;

  const classificacao: ResultadoRiscos["classificacao"] =
    totalCriticos > 0 ? "MULTIPLOS_INDICIOS_GRAVES" : totalAtencao > 0 ? "PONTOS_DE_ATENCAO" : "SEM_INDICIO_RELEVANTE";

  return { alertas, totalCriticos, totalAtencao, classificacao };
}
