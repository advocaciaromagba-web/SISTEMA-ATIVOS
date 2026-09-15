/**
 * Julgamento das propostas e apuração da empresa vencedora.
 *
 * Licitação tem DUAS fases, e confundi-las é erro clássico:
 *
 *   - CLASSIFICAÇÃO / DESCLASSIFICAÇÃO trata da PROPOSTA (preço, desconto,
 *     lance). Desclassifica-se proposta acima do orçamento, inexequível ou
 *     que não atende ao edital — Lei nº 14.133/2021, art. 59.
 *   - HABILITAÇÃO / INABILITAÇÃO trata dos DOCUMENTOS — art. 62 e seguintes,
 *     e é o que `classificacao.ts` já apura.
 *
 * A ordem entre elas é a da lei: julga-se a proposta primeiro e só então se
 * examina a habilitação de quem ficou em primeiro lugar (art. 17, caput e
 * §1º). Fazer o contrário obriga a analisar documento de quem não teria
 * chance, que é exatamente o desperdício que a inversão de fases resolveu.
 *
 * Vencedora, portanto, é a primeira da ordem de classificação que também
 * esteja habilitada. Se a primeira cair na habilitação, passa-se à segunda —
 * e é isso que este módulo apura.
 *
 * O que NÃO se automatiza aqui, e por quê:
 *   - "Melhor técnica" e "técnica e preço" dependem de nota atribuída por
 *     banca, que este sistema não tem. O critério é aceito no cadastro, mas a
 *     ordem não é calculada sozinha — fica declarado na apuração.
 *   - Conformidade da proposta com as especificações do edital é juízo
 *     técnico sobre o objeto. Entra como ponto a conferir, nunca como
 *     desclassificação automática.
 */
import type { Recomendacao } from "./classificacao";

export type CriterioJulgamento = "MENOR_PRECO" | "MAIOR_DESCONTO" | "MAIOR_LANCE" | "OUTRO";

export const ROTULO_CRITERIO: Record<CriterioJulgamento, string> = {
  MENOR_PRECO: "Menor preço",
  MAIOR_DESCONTO: "Maior desconto",
  MAIOR_LANCE: "Maior lance",
  OUTRO: "Outro (não ordenado automaticamente)",
};

/** Critérios em que o maior valor vence. */
const MAIOR_VENCE: CriterioJulgamento[] = ["MAIOR_DESCONTO", "MAIOR_LANCE"];

/**
 * Piso de exequibilidade em obra e serviço de engenharia: 75% do orçamento
 * estimado (Lei nº 14.133/2021, art. 59, §4º). Abaixo disso a lei presume
 * inexequível — presunção relativa, que admite prova em contrário, e por isso
 * aqui vira alerta para diligência, não desclassificação automática.
 */
const PISO_EXEQUIBILIDADE_ENGENHARIA = 0.75;

export type ParticipanteParaJulgar = {
  id: string;
  nome: string;
  documento: string;
  propostaValor: number | null;
  propostaSituacao: string | null;
  propostaMotivo: string | null;
  /** Recomendação da habilitação, vinda de `classificacao.ts`. */
  recomendacao: Recomendacao | null;
  microempresa: boolean;
};

export type ItemDaOrdem = {
  posicao: number | null;
  participanteId: string;
  nome: string;
  documento: string;
  propostaValor: number | null;
  /** CLASSIFICADA | DESCLASSIFICADA | SEM_PROPOSTA */
  situacaoProposta: "CLASSIFICADA" | "DESCLASSIFICADA" | "SEM_PROPOSTA";
  motivoDesclassificacao: string | null;
  recomendacaoHabilitacao: Recomendacao | null;
  /** Avisos que não desclassificam, mas a comissão precisa apreciar. */
  alertas: string[];
};

export type ResultadoJulgamento = {
  criterio: CriterioJulgamento | null;
  ordenavelAutomaticamente: boolean;
  ordem: ItemDaOrdem[];
  vencedor: ItemDaOrdem | null;
  /** Por que este é o vencedor, ou por que ainda não há um. */
  justificativa: string;
  /** Direito de preferência de ME/EPP a apreciar (LC 123/2006, arts. 44 e 45). */
  empateFicto: { beneficiadoId: string; nome: string; detalhe: string } | null;
  pendencias: string[];
};

function dinheiro(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function julgarPropostas(params: {
  criterio: string | null;
  valorEstimado: number | null;
  orcamentoSigiloso: boolean;
  tipoObjeto: string | null;
  participantes: ParticipanteParaJulgar[];
  /** Pregão e concorrência têm margem de 5%; as demais, 10%. */
  ehPregao?: boolean;
}): ResultadoJulgamento {
  const criterio = (params.criterio as CriterioJulgamento | null) ?? null;
  const ordenavel = criterio != null && criterio !== "OUTRO";
  const pendencias: string[] = [];

  // ----- 1. situação de cada proposta -----
  const itens: ItemDaOrdem[] = params.participantes.map((p) => {
    const alertas: string[] = [];
    let situacao: ItemDaOrdem["situacaoProposta"] = "CLASSIFICADA";
    let motivo: string | null = null;

    if (p.propostaValor == null) {
      situacao = "SEM_PROPOSTA";
    } else if (p.propostaSituacao === "DESCLASSIFICADA") {
      // Desclassificação lançada pela comissão prevalece sobre qualquer
      // apuração automática: é ato dela, não sugestão.
      situacao = "DESCLASSIFICADA";
      motivo = p.propostaMotivo ?? "Desclassificada pela comissão.";
    } else if (params.valorEstimado != null && !params.orcamentoSigiloso) {
      const acimaDoTeto =
        criterio === "MENOR_PRECO" && p.propostaValor > params.valorEstimado;

      if (acimaDoTeto) {
        situacao = "DESCLASSIFICADA";
        motivo =
          `Proposta de ${dinheiro(p.propostaValor)} acima do orçamento estimado de ` +
          `${dinheiro(params.valorEstimado)} (Lei nº 14.133/2021, art. 59, III).`;
      } else if (
        criterio === "MENOR_PRECO" &&
        params.tipoObjeto === "OBRA_SERVICO_ENGENHARIA" &&
        p.propostaValor < params.valorEstimado * PISO_EXEQUIBILIDADE_ENGENHARIA
      ) {
        alertas.push(
          `Proposta abaixo de 75% do orçamento estimado (${dinheiro(params.valorEstimado * PISO_EXEQUIBILIDADE_ENGENHARIA)}). ` +
            "A lei presume inexequível, mas a presunção é relativa: abra diligência para o licitante demonstrar a " +
            "exequibilidade antes de desclassificar (Lei nº 14.133/2021, art. 59, §§ 2º e 4º)."
        );
      }
    }

    if (situacao === "CLASSIFICADA") {
      alertas.push(
        "Conformidade da proposta com as especificações do edital não é conferida automaticamente — é juízo " +
          "técnico sobre o objeto, e cabe à comissão."
      );
    }

    return {
      posicao: null,
      participanteId: p.id,
      nome: p.nome,
      documento: p.documento,
      propostaValor: p.propostaValor,
      situacaoProposta: situacao,
      motivoDesclassificacao: motivo,
      recomendacaoHabilitacao: p.recomendacao,
      alertas,
    };
  });

  // ----- 2. ordem de classificação -----
  const classificadas = itens.filter((i) => i.situacaoProposta === "CLASSIFICADA" && i.propostaValor != null);

  if (ordenavel) {
    const maior = MAIOR_VENCE.includes(criterio);
    classificadas.sort((a, b) => (maior ? b.propostaValor! - a.propostaValor! : a.propostaValor! - b.propostaValor!));
    classificadas.forEach((i, indice) => {
      i.posicao = indice + 1;
    });
  } else if (criterio === "OUTRO") {
    pendencias.push(
      "O critério de julgamento deste certame não é ordenado automaticamente (ex.: melhor técnica, ou técnica e " +
        "preço, que dependem de nota atribuída por banca). A ordem precisa ser estabelecida pela comissão."
    );
  } else {
    pendencias.push("Critério de julgamento não informado no certame — sem ele não há como ordenar as propostas.");
  }

  if (params.valorEstimado == null && !params.orcamentoSigiloso) {
    pendencias.push(
      "Orçamento estimado não informado: não há como conferir se alguma proposta ficou acima do teto nem apurar " +
        "indício de inexequibilidade."
    );
  }

  const semProposta = itens.filter((i) => i.situacaoProposta === "SEM_PROPOSTA");
  if (semProposta.length > 0) {
    pendencias.push(
      `${semProposta.length} participante(s) ainda sem proposta lançada: ${semProposta.map((i) => i.nome).join(", ")}.`
    );
  }

  // ----- 3. empate ficto de ME/EPP (LC 123/2006, arts. 44 e 45) -----
  let empateFicto: ResultadoJulgamento["empateFicto"] = null;
  const margem = params.ehPregao ? 0.05 : 0.1;

  if (ordenavel && criterio === "MENOR_PRECO" && classificadas.length >= 2) {
    const primeira = classificadas[0];
    const primeiroEhMe = params.participantes.find((p) => p.id === primeira.participanteId)?.microempresa ?? false;

    if (!primeiroEhMe && primeira.propostaValor != null) {
      const limite = primeira.propostaValor * (1 + margem);
      const beneficiada = classificadas
        .slice(1)
        .find(
          (i) =>
            i.propostaValor != null &&
            i.propostaValor <= limite &&
            (params.participantes.find((p) => p.id === i.participanteId)?.microempresa ?? false)
        );

      if (beneficiada) {
        empateFicto = {
          beneficiadoId: beneficiada.participanteId,
          nome: beneficiada.nome,
          detalhe:
            `${beneficiada.nome} é ME/EPP e ofertou ${dinheiro(beneficiada.propostaValor!)}, dentro dos ` +
            `${(margem * 100).toFixed(0)}% acima da melhor proposta (${dinheiro(primeira.propostaValor)}). ` +
            "Configura-se empate ficto: antes de adjudicar, é preciso assegurar a ela a oportunidade de cobrir a " +
            "oferta (LC nº 123/2006, arts. 44 e 45).",
        };
      }
    }
  }

  // ----- 4. vencedora: melhor proposta que também esteja habilitada -----
  let vencedor: ItemDaOrdem | null = null;
  let justificativa: string;

  if (!ordenavel) {
    justificativa =
      "A ordem de classificação não pôde ser apurada automaticamente, então não há vencedora a indicar. " +
      "Estabelecida a ordem pela comissão, a habilitação de cada participante já está apurada nesta tela.";
  } else if (classificadas.length === 0) {
    justificativa = "Nenhuma proposta classificada até aqui — não há vencedora a indicar.";
  } else {
    const habilitada = classificadas.find((i) => i.recomendacaoHabilitacao === "HABILITAR");

    if (habilitada) {
      vencedor = habilitada;
      const aFrente = classificadas.slice(0, classificadas.indexOf(habilitada));
      justificativa =
        aFrente.length === 0
          ? `${habilitada.nome} apresentou a melhor proposta (${dinheiro(habilitada.propostaValor!)}) e a documentação de habilitação não tem impedimento, irregularidade ou pendência nas fontes consultadas.`
          : `${habilitada.nome} é a primeira da ordem de classificação cuja habilitação está regular. ` +
            `${aFrente.length} proposta(s) melhor colocada(s) não passaram no exame da documentação: ` +
            `${aFrente.map((i) => i.nome).join(", ")}.`;
    } else {
      const primeira = classificadas[0];
      justificativa =
        "Nenhum participante classificado está com a habilitação regular. A melhor proposta é de " +
        `${primeira.nome} (${dinheiro(primeira.propostaValor!)}), mas a documentação dele ainda não está em ordem — ` +
        "vejam os apontamentos de cada um antes de decidir.";
    }
  }

  if (empateFicto && vencedor && vencedor.participanteId !== empateFicto.beneficiadoId) {
    justificativa +=
      " Atenção: há empate ficto de ME/EPP a resolver antes da adjudicação — veja o aviso abaixo.";
  }

  // A ordem devolvida traz as classificadas em ordem, e depois as demais.
  const ordem = [...classificadas, ...itens.filter((i) => i.situacaoProposta !== "CLASSIFICADA")];

  return { criterio, ordenavelAutomaticamente: ordenavel, ordem, vencedor, justificativa, empateFicto, pendencias };
}
