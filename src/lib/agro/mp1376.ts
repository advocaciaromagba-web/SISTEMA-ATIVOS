/**
 * Motor de enquadramento na MP nº 1.376, de 15 de julho de 2026.
 *
 * TUDO aqui vem do texto oficial da Medida Provisória (Diário Oficial da
 * União, 16/07/2026), obtido direto do Senado Federal — nenhum limite, taxa
 * ou prazo foi estimado ou lembrado de memória. Ver FONTE no fim do arquivo.
 *
 * Este é código determinístico, não IA: a lei não muda de interpretação
 * dependendo de como o modelo de linguagem "entendeu" o caso. A IA (quando
 * usada nesta solução) só ajuda a ler o PDF do contrato e sugerir os fatos
 * que entram aqui — quem decide enquadramento é esta função, sempre citando
 * o artigo exato, pra o advogado conferir contra o texto da lei.
 *
 * A MP está com prazo de vigência até 12/09/2026 (60 dias + prorrogação
 * possível de mais 60, art. 62 §3º-7º da Constituição) — se não for
 * convertida em lei ou perder eficácia, ESTE ARQUIVO precisa ser revisto.
 */

export type CategoriaOperacao = "CUSTEIO" | "COMERCIALIZACAO" | "INDUSTRIALIZACAO" | "INVESTIMENTO";
export type CategoriaBeneficiario = "PRONAF" | "PRONAMP" | "DEMAIS";
export type CausaPerda = "CLIMATICO" | "PRECO" | "AMBOS";
export type Modalidade = "GERAL" | "FAVORECIDA";

export type FatosContrato = {
  categoriaOperacao: CategoriaOperacao | null;
  dataContratacaoOriginal: Date | null;
  foiRenegociadoOuProrrogado: boolean | null;
  dataRenegociacaoOuProrrogacao: Date | null;
  /// Situação na data de contratação da NOVA linha de composição de dívida.
  situacaoAdimplenciaNaContratacaoNovaLinha: "ADIMPLENTE" | "INADIMPLENTE" | null;
  dataInicioInadimplencia: Date | null;
  permaneceInadimplenteEm31Mai2026: boolean | null;

  categoriaBeneficiario: CategoriaBeneficiario | null;
  valorOperacao: number | null;

  numeroSafrasComPerda: number | null;
  percentualReducaoRenda: number | null;
  causaPerda: CausaPerda | null;
  temLaudoTecnico: boolean | null;

  origemFundoSocial: boolean | null;
  origemMP1314_2025: boolean | null;
  encaminhadoDividaAtivaUniao: boolean | null;
};

export type ItemChecklist = {
  requisito: string;
  artigo: string;
  atende: boolean | "INDETERMINADO";
  observacao: string;
};

export type CondicoesAplicaveis = {
  limiteCredito: number;
  taxaJurosAnual: number;
  prazoReembolsoAnos: number;
  prazoCarenciaAnos: number;
  artigo: string;
};

export type ResultadoMp1376 = {
  fonte: string;
  dataConsulta: string;
  prazoContratacaoLimite: string;
  operacaoElegivel: boolean | "INDETERMINADO";
  beneficiarioElegivel: boolean | "INDETERMINADO";
  modalidade: Modalidade | null;
  temExclusao: boolean;
  enquadraNaMP1376: boolean | "INDETERMINADO";
  condicoes: CondicoesAplicaveis | null;
  checklist: ItemChecklist[];
  requisitosFaltantes: string[];
};

const PUBLICACAO = new Date("2026-07-15T00:00:00-03:00");
const PRAZO_CONTRATACAO_DIAS = 120;
const LIMITE_INADIMPLENCIA_INICIO = new Date("2024-01-01T00:00:00-03:00");
const LIMITE_RENEGOCIACAO_ATE = new Date("2026-05-31T23:59:59-03:00");
const LIMITE_INADIMPLENCIA_31MAI2026 = new Date("2026-05-31T23:59:59-03:00");
const LIMITE_INVESTIMENTO_INICIO = new Date("2024-01-01T00:00:00-03:00");
const LIMITE_INVESTIMENTO_FIM = new Date("2026-12-31T23:59:59-03:00");
const LIMITE_CONTRATACAO_ATE = new Date("2025-12-31T23:59:59-03:00");

/** Art. 1º, § 4º — condições da modalidade geral. */
const CONDICOES_GERAL: Record<CategoriaBeneficiario, CondicoesAplicaveis> = {
  PRONAF: { limiteCredito: 400_000, taxaJurosAnual: 6, prazoReembolsoAnos: 8, prazoCarenciaAnos: 2, artigo: "Art. 1º, § 4º, I 'a' e II 'a'" },
  PRONAMP: { limiteCredito: 2_000_000, taxaJurosAnual: 9, prazoReembolsoAnos: 8, prazoCarenciaAnos: 2, artigo: "Art. 1º, § 4º, I 'b' e II 'b'" },
  DEMAIS: { limiteCredito: 4_000_000, taxaJurosAnual: 12, prazoReembolsoAnos: 8, prazoCarenciaAnos: 2, artigo: "Art. 1º, § 4º, I 'c' e II 'c'" },
};

/** Art. 1º, § 7º — condições da modalidade favorecida (3+ safras, só clima, ≥40%). */
const CONDICOES_FAVORECIDA: Record<CategoriaBeneficiario, CondicoesAplicaveis> = {
  PRONAF: { limiteCredito: 500_000, taxaJurosAnual: 5, prazoReembolsoAnos: 10, prazoCarenciaAnos: 2, artigo: "Art. 1º, § 7º, I 'a' e II 'a'" },
  PRONAMP: { limiteCredito: 2_500_000, taxaJurosAnual: 8, prazoReembolsoAnos: 10, prazoCarenciaAnos: 2, artigo: "Art. 1º, § 7º, I 'b' e II 'b'" },
  DEMAIS: { limiteCredito: 8_000_000, taxaJurosAnual: 11, prazoReembolsoAnos: 10, prazoCarenciaAnos: 2, artigo: "Art. 1º, § 7º, I 'c' e II 'c'" },
};

function checarOperacaoElegivel(f: FatosContrato): { resultado: boolean | "INDETERMINADO"; item: ItemChecklist } {
  if (!f.categoriaOperacao) {
    return {
      resultado: "INDETERMINADO",
      item: { requisito: "Categoria da operação identificada", artigo: "Art. 1º, caput", atende: "INDETERMINADO", observacao: "Informe se é custeio, comercialização, industrialização ou investimento." },
    };
  }

  if (f.categoriaOperacao === "INVESTIMENTO") {
    if (!f.dataContratacaoOriginal || f.dataInicioInadimplencia === null || f.permaneceInadimplenteEm31Mai2026 === null) {
      return {
        resultado: "INDETERMINADO",
        item: { requisito: "Parcela de investimento enquadrável (Art. 1º, III)", artigo: "Art. 1º, III, 'a' e 'b'", atende: "INDETERMINADO", observacao: "Faltam data de contratação original, data de início da inadimplência ou se permanece inadimplente em 31/05/2026." },
      };
    }
    const contratadaAteLimite = f.dataContratacaoOriginal <= LIMITE_CONTRATACAO_ATE;
    const inadimplenteDesde2024 = f.dataInicioInadimplencia >= LIMITE_INADIMPLENCIA_INICIO;
    const atende = contratadaAteLimite && inadimplenteDesde2024 && f.permaneceInadimplenteEm31Mai2026;
    return {
      resultado: atende,
      item: {
        requisito: "Parcela de investimento vencida/vincenda 01/01/2024–31/12/2026, de operação contratada até 31/12/2025, inadimplente desde 01/01/2024 e ainda em 31/05/2026",
        artigo: "Art. 1º, III, 'a' e 'b'",
        atende,
        observacao: atende ? "Atende." : "Não atende às condições cumulativas do inciso III.",
      },
    };
  }

  // CUSTEIO | COMERCIALIZACAO | INDUSTRIALIZACAO — inciso I (adimplente, renegociada) ou II (inadimplente)
  if (f.situacaoAdimplenciaNaContratacaoNovaLinha === "ADIMPLENTE") {
    if (f.foiRenegociadoOuProrrogado === null || (f.foiRenegociadoOuProrrogado && !f.dataRenegociacaoOuProrrogacao)) {
      return {
        resultado: "INDETERMINADO",
        item: { requisito: "Renegociada/prorrogada até 31/05/2026 e adimplente na contratação da nova linha (Art. 1º, I)", artigo: "Art. 1º, I", atende: "INDETERMINADO", observacao: "Falta confirmar se houve renegociação/prorrogação e a data." },
      };
    }
    const atende = f.foiRenegociadoOuProrrogado ? f.dataRenegociacaoOuProrrogacao! <= LIMITE_RENEGOCIACAO_ATE : false;
    return {
      resultado: atende,
      item: {
        requisito: "Renegociada/prorrogada até 31/05/2026 e adimplente na contratação da nova linha",
        artigo: "Art. 1º, I",
        atende,
        observacao: atende ? "Atende — adimplente e renegociada/prorrogada dentro do prazo." : "Precisa ter sido renegociada ou prorrogada até 31/05/2026.",
      },
    };
  }

  if (f.situacaoAdimplenciaNaContratacaoNovaLinha === "INADIMPLENTE") {
    if (!f.dataContratacaoOriginal || f.dataInicioInadimplencia === null || f.permaneceInadimplenteEm31Mai2026 === null) {
      return {
        resultado: "INDETERMINADO",
        item: { requisito: "Contratada até 31/12/2025, inadimplente desde 01/01/2024 e ainda em 31/05/2026 (Art. 1º, II)", artigo: "Art. 1º, II", atende: "INDETERMINADO", observacao: "Faltam datas para conferir o enquadramento." },
      };
    }
    const contratadaAteLimite = f.dataContratacaoOriginal <= LIMITE_CONTRATACAO_ATE;
    const inadimplenteDesde2024 = f.dataInicioInadimplencia >= LIMITE_INADIMPLENCIA_INICIO;
    const atende = contratadaAteLimite && inadimplenteDesde2024 && f.permaneceInadimplenteEm31Mai2026;
    return {
      resultado: atende,
      item: {
        requisito: "Contratada até 31/12/2025, inadimplente desde 01/01/2024 e ainda em 31/05/2026",
        artigo: "Art. 1º, II",
        atende,
        observacao: atende ? "Atende." : "Não atende às condições cumulativas do inciso II.",
      },
    };
  }

  return {
    resultado: "INDETERMINADO",
    item: { requisito: "Situação de adimplência na contratação da nova linha", artigo: "Art. 1º, I e II", atende: "INDETERMINADO", observacao: "Informe se a operação está adimplente ou inadimplente." },
  };
}

function checarBeneficiario(f: FatosContrato): { modalidade: Modalidade | null; resultado: boolean | "INDETERMINADO"; itens: ItemChecklist[] } {
  const itens: ItemChecklist[] = [];

  if (f.numeroSafrasComPerda === null || f.percentualReducaoRenda === null || f.causaPerda === null || f.temLaudoTecnico === null) {
    itens.push({
      requisito: "Perdas de safra comprovadas (número de safras, % de redução, causa e laudo técnico)",
      artigo: "Art. 1º, § 1º e § 7º",
      atende: "INDETERMINADO",
      observacao: "Faltam dados sobre as perdas de safra para avaliar a modalidade geral ou favorecida.",
    });
    return { modalidade: null, resultado: "INDETERMINADO", itens };
  }

  const temLaudo = f.temLaudoTecnico;
  itens.push({
    requisito: "Laudo emitido por profissional habilitado, comprovando a perda",
    artigo: "Art. 1º, § 1º e § 7º",
    atende: temLaudo,
    observacao: temLaudo
      ? "Laudo presente — confira se atende metodologia, renda esperada x apurada e nexo causal (obrigatório, mas o texto da MP não define o profissional habilitado nem a metodologia — ponto de atenção)."
      : "Sem laudo técnico, não há como comprovar a perda perante a instituição financeira.",
  });

  // Favorecida: 3+ safras, só clima, >=40%
  const favorecidaSafras = f.numeroSafrasComPerda >= 3;
  const favorecidaCausa = f.causaPerda === "CLIMATICO";
  const favorecidaPercentual = f.percentualReducaoRenda >= 40;
  const atendeFavorecida = favorecidaSafras && favorecidaCausa && favorecidaPercentual && temLaudo;

  // Geral: 2+ safras, clima OU preço, >=30%
  const geralSafras = f.numeroSafrasComPerda >= 2;
  const geralCausa = f.causaPerda === "CLIMATICO" || f.causaPerda === "PRECO" || f.causaPerda === "AMBOS";
  const geralPercentual = f.percentualReducaoRenda >= 30;
  const atendeGeral = geralSafras && geralCausa && geralPercentual && temLaudo;

  itens.push({
    requisito: "3 ou mais safras entre 2019–2025, perda causada exclusivamente por evento climático extremo, com redução ≥ 40% da renda bruta esperada",
    artigo: "Art. 1º, § 7º",
    atende: atendeFavorecida,
    observacao: atendeFavorecida
      ? "Atende à modalidade favorecida — limites e taxas melhores se aplicam."
      : `Não atende: ${!favorecidaSafras ? "menos de 3 safras; " : ""}${!favorecidaCausa ? "causa não é exclusivamente climática; " : ""}${!favorecidaPercentual ? "redução menor que 40%; " : ""}`.trim(),
  });

  itens.push({
    requisito: "2 ou mais safras entre 2019–2025, perda por evento climático extremo ou redução de preço, com redução ≥ 30% da renda bruta esperada",
    artigo: "Art. 1º, § 1º",
    atende: atendeGeral,
    observacao: atendeGeral
      ? "Atende à modalidade geral."
      : `Não atende: ${!geralSafras ? "menos de 2 safras; " : ""}${!geralPercentual ? "redução menor que 30%; " : ""}`.trim(),
  });

  if (atendeFavorecida) return { modalidade: "FAVORECIDA", resultado: true, itens };
  if (atendeGeral) return { modalidade: "GERAL", resultado: true, itens };
  return { modalidade: null, resultado: false, itens };
}

function checarExclusoes(f: FatosContrato): { temExclusao: boolean; itens: ItemChecklist[] } {
  const itens: ItemChecklist[] = [];
  let temExclusao = false;

  if (f.origemFundoSocial === null) {
    itens.push({ requisito: "Não contratada ao amparo do Fundo Social (art. 47-A da Lei nº 12.351/2010)", artigo: "Art. 1º, § 8º, I", atende: "INDETERMINADO", observacao: "Confirme a origem dos recursos." });
  } else if (f.origemFundoSocial) {
    temExclusao = true;
    itens.push({ requisito: "Não contratada ao amparo do Fundo Social (art. 47-A da Lei nº 12.351/2010)", artigo: "Art. 1º, § 8º, I", atende: false, observacao: "EXCLUSÃO: contrato vedado pela MP." });
  }

  if (f.origemMP1314_2025 === null) {
    itens.push({ requisito: "Não contratada ao amparo da MP nº 1.314/2025 (salvo exceção do § 8º, II)", artigo: "Art. 1º, § 8º, II", atende: "INDETERMINADO", observacao: "Confirme se a operação original foi contratada sob a MP 1.314/2025." });
  } else if (f.origemMP1314_2025) {
    itens.push({ requisito: "Não contratada ao amparo da MP nº 1.314/2025 (salvo exceção do § 8º, II)", artigo: "Art. 1º, § 8º, II", atende: "INDETERMINADO", observacao: "Há exceção para operações com recursos livres/direcionados dentro dos limites — confira as condições exatas do § 8º, II antes de excluir." });
  }

  if (f.encaminhadoDividaAtivaUniao === null) {
    itens.push({ requisito: "Não encaminhada para a Dívida Ativa da União", artigo: "Art. 1º, § 9º", atende: "INDETERMINADO", observacao: "Confirme se a operação foi encaminhada à Dívida Ativa da União." });
  } else if (f.encaminhadoDividaAtivaUniao) {
    temExclusao = true;
    itens.push({ requisito: "Não encaminhada para a Dívida Ativa da União", artigo: "Art. 1º, § 9º", atende: false, observacao: "EXCLUSÃO: a MP não se aplica a operações já na Dívida Ativa da União." });
  }

  return { temExclusao, itens };
}

export function analisarEnquadramentoMP1376(f: FatosContrato): ResultadoMp1376 {
  const { resultado: operacaoElegivel, item: itemOperacao } = checarOperacaoElegivel(f);
  const { modalidade, resultado: beneficiarioElegivel, itens: itensBeneficiario } = checarBeneficiario(f);
  const { temExclusao, itens: itensExclusao } = checarExclusoes(f);

  const checklist: ItemChecklist[] = [itemOperacao, ...itensBeneficiario, ...itensExclusao];

  let condicoes: CondicoesAplicaveis | null = null;
  if (modalidade && f.categoriaBeneficiario) {
    const tabela = modalidade === "FAVORECIDA" ? CONDICOES_FAVORECIDA : CONDICOES_GERAL;
    condicoes = tabela[f.categoriaBeneficiario];
  } else if (!f.categoriaBeneficiario) {
    checklist.push({
      requisito: "Categoria do beneficiário identificada (Pronaf, Pronamp ou demais produtores)",
      artigo: "Art. 1º, § 4º e § 7º",
      atende: "INDETERMINADO",
      observacao: "Sem saber a categoria do produtor não é possível apurar limite, taxa e prazo aplicáveis.",
    });
  }

  const algumIndeterminado = checklist.some((i) => i.atende === "INDETERMINADO");
  let enquadraNaMP1376: boolean | "INDETERMINADO";
  if (temExclusao) {
    enquadraNaMP1376 = false;
  } else if (operacaoElegivel === "INDETERMINADO" || beneficiarioElegivel === "INDETERMINADO" || algumIndeterminado) {
    enquadraNaMP1376 = "INDETERMINADO";
  } else {
    enquadraNaMP1376 = operacaoElegivel === true && beneficiarioElegivel === true;
  }

  const requisitosFaltantes = checklist.filter((i) => i.atende === false || i.atende === "INDETERMINADO").map((i) => `${i.requisito} (${i.artigo})`);

  return {
    fonte: "MP nº 1.376, de 15 de julho de 2026 (DOU Edição Extra C, 16/07/2026) — texto oficial via Senado Federal",
    dataConsulta: new Date().toISOString(),
    prazoContratacaoLimite: new Date(PUBLICACAO.getTime() + PRAZO_CONTRATACAO_DIAS * 86_400_000).toISOString().slice(0, 10),
    operacaoElegivel,
    beneficiarioElegivel,
    modalidade,
    temExclusao,
    enquadraNaMP1376,
    condicoes,
    checklist,
    requisitosFaltantes,
  };
}

/**
 * FONTE PRIMÁRIA: Medida Provisória nº 1.376, de 15 de julho de 2026.
 * Texto oficial: Diário Oficial da União, Edição Extra C, 16/07/2026, p. 1-2.
 * Obtido via Senado Federal (legis.senado.leg.br) em 07/09/2026.
 *
 * ATENÇÃO: é Medida Provisória — vigência de 60 dias, prorrogável por mais
 * 60 (CF, art. 62, § 3º e § 7º). Publicada em 15/07/2026, prazo inicial de
 * deliberação encerra em 12/09/2026. Confirme se foi convertida em lei,
 * prorrogada ou perdeu eficácia antes de aplicar este motor a um caso novo.
 */
