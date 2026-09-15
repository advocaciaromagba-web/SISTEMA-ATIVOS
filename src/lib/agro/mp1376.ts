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
import { moeda } from "@/lib/formato";

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
  /** Só para INVESTIMENTO: o inciso III delimita a janela de vencimento da parcela. */
  vencimentoParcelaInvestimento: Date | null;

  categoriaBeneficiario: CategoriaBeneficiario | null;
  valorOperacao: number | null;

  numeroSafrasComPerda: number | null;
  /** Anos declarados das safras com perda — confere a janela do § 1º/§ 7º ("entre 2019 e 2025"), não só a contagem. */
  anosSafrasComPerda: string[] | null;
  percentualReducaoRenda: number | null;
  causaPerda: CausaPerda | null;
  temLaudoTecnico: boolean | null;

  origemFundoSocial: boolean | null;
  origemMP1314_2025: boolean | null;
  /** Só relevante quando origemMP1314_2025 = true — ver comentário no schema (`AgroContrato.origemMP1314RecursosLivresDirecionados`). */
  origemMP1314RecursosLivresDirecionados: boolean | null;
  encaminhadoDividaAtivaUniao: boolean | null;
  /** Data em que a NOVA linha desta MP foi/será contratada — distinta de `dataContratacaoOriginal`. Ver Art. 1º, § 4º, IV. */
  dataContratacaoNovaLinha: Date | null;
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
  /**
   * Faixa adicional acima de `limiteCredito`, só para PRONAF/PRONAMP na
   * modalidade geral (§§ 5º e 6º) — cobrando a taxa da categoria seguinte
   * sobre o que exceder o limite normal. `null` quando não há faixa
   * adicional (categoria DEMAIS, e modalidade favorecida — não localizei
   * dispositivo equivalente aos §§ 5º/6º para o § 7º, então não presumo
   * que exista).
   */
  faixaAdicional: { limite: number; taxaJurosAnual: number; artigo: string } | null;
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
// A permanência da inadimplência em 31/05/2026 não é derivada de data: é um
// fato que quem monta o caso declara (`permaneceInadimplenteEm31Mai2026`),
// porque depende do extrato do banco, não de aritmética de calendário. Uma
// constante de data aqui daria a impressão de que existe um cálculo que não
// existe — foi assim que uma janela do inciso III passou despercebida.
const LIMITE_INVESTIMENTO_INICIO = new Date("2024-01-01T00:00:00-03:00");
const LIMITE_INVESTIMENTO_FIM = new Date("2026-12-31T23:59:59-03:00");
const LIMITE_CONTRATACAO_ATE = new Date("2025-12-31T23:59:59-03:00");

/**
 * Art. 1º, § 4º — condições da modalidade geral. As faixas adicionais dos
 * §§ 5º e 6º dão, a PRONAF e PRONAMP que excedem o limite normal, uma
 * operação a mais até um teto extra — cobrando a taxa da categoria
 * seguinte (§ 4º, II, alíneas 'b'/'c') sobre essa faixa.
 */
const CONDICOES_GERAL: Record<CategoriaBeneficiario, CondicoesAplicaveis> = {
  PRONAF: {
    limiteCredito: 400_000,
    taxaJurosAnual: 6,
    prazoReembolsoAnos: 8,
    prazoCarenciaAnos: 2,
    artigo: "Art. 1º, § 4º, I 'a' e II 'a'",
    faixaAdicional: { limite: 600_000, taxaJurosAnual: 9, artigo: "Art. 1º, § 5º c/c § 4º, II 'b'" },
  },
  PRONAMP: {
    limiteCredito: 2_000_000,
    taxaJurosAnual: 9,
    prazoReembolsoAnos: 8,
    prazoCarenciaAnos: 2,
    artigo: "Art. 1º, § 4º, I 'b' e II 'b'",
    faixaAdicional: { limite: 2_000_000, taxaJurosAnual: 12, artigo: "Art. 1º, § 6º c/c § 4º, II 'c'" },
  },
  DEMAIS: { limiteCredito: 4_000_000, taxaJurosAnual: 12, prazoReembolsoAnos: 8, prazoCarenciaAnos: 2, artigo: "Art. 1º, § 4º, I 'c' e II 'c'", faixaAdicional: null },
};

/** Art. 1º, § 7º — condições da modalidade favorecida (3+ safras, só clima, ≥40%). */
const CONDICOES_FAVORECIDA: Record<CategoriaBeneficiario, CondicoesAplicaveis> = {
  PRONAF: { limiteCredito: 500_000, taxaJurosAnual: 5, prazoReembolsoAnos: 10, prazoCarenciaAnos: 2, artigo: "Art. 1º, § 7º, I 'a' e II 'a'", faixaAdicional: null },
  PRONAMP: { limiteCredito: 2_500_000, taxaJurosAnual: 8, prazoReembolsoAnos: 10, prazoCarenciaAnos: 2, artigo: "Art. 1º, § 7º, I 'b' e II 'b'", faixaAdicional: null },
  DEMAIS: { limiteCredito: 8_000_000, taxaJurosAnual: 11, prazoReembolsoAnos: 10, prazoCarenciaAnos: 2, artigo: "Art. 1º, § 7º, I 'c' e II 'c'", faixaAdicional: null },
};

/** Art. 1º, § 1º e § 7º — a MP só alcança perda de safra registrada entre 2019 e 2025. */
const SAFRA_ANO_MIN = 2019;
const SAFRA_ANO_MAX = 2025;

function checarOperacaoElegivel(f: FatosContrato): { resultado: boolean | "INDETERMINADO"; item: ItemChecklist } {
  if (!f.categoriaOperacao) {
    return {
      resultado: "INDETERMINADO",
      item: { requisito: "Categoria da operação identificada", artigo: "Art. 1º, caput", atende: "INDETERMINADO", observacao: "Informe se é custeio, comercialização, industrialização ou investimento." },
    };
  }

  if (f.categoriaOperacao === "INVESTIMENTO") {
    const requisitoInvestimento =
      "Parcela de investimento vencida/vincenda 01/01/2024–31/12/2026, de operação contratada até 31/12/2025, inadimplente desde 01/01/2024 e ainda em 31/05/2026";

    if (!f.dataContratacaoOriginal || f.dataInicioInadimplencia === null || f.permaneceInadimplenteEm31Mai2026 === null) {
      return {
        resultado: "INDETERMINADO",
        item: { requisito: "Parcela de investimento enquadrável (Art. 1º, III)", artigo: "Art. 1º, III, 'a' e 'b'", atende: "INDETERMINADO", observacao: "Faltam data de contratação original, data de início da inadimplência ou se permanece inadimplente em 31/05/2026." },
      };
    }

    // O caput do inciso III delimita QUAIS parcelas a linha alcança: as
    // "vencidas ou vincendas entre 1º de janeiro de 2024 e 31 de dezembro de
    // 2026". Sem a data de vencimento não há como afirmar que a parcela está
    // nessa janela — e dar o requisito por atendido aqui seria afirmar ao
    // advogado que algo foi conferido quando não foi.
    if (!f.vencimentoParcelaInvestimento) {
      return {
        resultado: "INDETERMINADO",
        item: {
          requisito: requisitoInvestimento,
          artigo: "Art. 1º, III, caput",
          atende: "INDETERMINADO",
          observacao:
            "Informe o vencimento da parcela de investimento. O inciso III só alcança parcela vencida ou vincenda " +
            "entre 01/01/2024 e 31/12/2026, e sem essa data a janela não pode ser conferida.",
        },
      };
    }

    const dentroDaJanela =
      f.vencimentoParcelaInvestimento >= LIMITE_INVESTIMENTO_INICIO &&
      f.vencimentoParcelaInvestimento <= LIMITE_INVESTIMENTO_FIM;
    const contratadaAteLimite = f.dataContratacaoOriginal <= LIMITE_CONTRATACAO_ATE;
    const inadimplenteDesde2024 = f.dataInicioInadimplencia >= LIMITE_INADIMPLENCIA_INICIO;
    const atende = dentroDaJanela && contratadaAteLimite && inadimplenteDesde2024 && f.permaneceInadimplenteEm31Mai2026;

    const faltou: string[] = [];
    if (!dentroDaJanela) faltou.push("a parcela vence fora da janela de 01/01/2024 a 31/12/2026 (caput do inciso III)");
    if (!contratadaAteLimite) faltou.push("a operação de origem foi contratada depois de 31/12/2025 (alínea 'a')");
    if (!inadimplenteDesde2024) faltou.push("a inadimplência começou antes de 01/01/2024 (alínea 'b')");
    if (!f.permaneceInadimplenteEm31Mai2026) faltou.push("não permanecia inadimplente em 31/05/2026 (alínea 'b')");

    return {
      resultado: atende,
      item: {
        requisito: requisitoInvestimento,
        artigo: "Art. 1º, III, caput, 'a' e 'b'",
        atende,
        observacao: atende ? "Atende." : `Não atende às condições cumulativas do inciso III: ${faltou.join("; ")}.`,
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

  // O motivo é montado a partir do que efetivamente reprovou. Item que diz
  // "não atende" sem dizer o quê não serve para o advogado decidir nada — e
  // era o que acontecia quando a causa da perda era o motivo da reprovação,
  // que não entrava na mensagem da modalidade geral.
  const motivo = (partes: string[]) =>
    partes.length > 0 ? `Não atende: ${partes.join("; ")}.` : "Não atende às condições deste parágrafo.";

  const faltouFavorecida: string[] = [];
  if (!favorecidaSafras) faltouFavorecida.push("menos de 3 safras");
  if (!favorecidaCausa) faltouFavorecida.push("causa não é exclusivamente climática");
  if (!favorecidaPercentual) faltouFavorecida.push("redução menor que 40%");
  if (!temLaudo) faltouFavorecida.push("sem laudo técnico");

  const faltouGeral: string[] = [];
  if (!geralSafras) faltouGeral.push("menos de 2 safras");
  if (!geralCausa) faltouGeral.push("causa da perda não informada ou fora das hipóteses do parágrafo");
  if (!geralPercentual) faltouGeral.push("redução menor que 30%");
  if (!temLaudo) faltouGeral.push("sem laudo técnico");

  itens.push({
    requisito: "3 ou mais safras entre 2019–2025, perda causada exclusivamente por evento climático extremo, com redução ≥ 40% da renda bruta esperada",
    artigo: "Art. 1º, § 7º",
    atende: atendeFavorecida,
    observacao: atendeFavorecida
      ? "Atende à modalidade favorecida — limites e taxas melhores se aplicam."
      : motivo(faltouFavorecida),
  });

  itens.push({
    requisito: "2 ou mais safras entre 2019–2025, perda por evento climático extremo ou redução de preço, com redução ≥ 30% da renda bruta esperada",
    artigo: "Art. 1º, § 1º",
    atende: atendeGeral,
    observacao: atendeGeral ? "Atende à modalidade geral." : motivo(faltouGeral),
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
    // O § 8º, II veda por regra, mas abre exceção "quando se tratar de
    // operações efetuadas com recursos livres e direcionados das
    // instituições financeiras, observados os limites por mutuário
    // estabelecidos". Os "limites por mutuário" são de resolução do CMN,
    // não estão na própria MP — então mesmo confirmando recursos livres e
    // direcionados, o enquadramento fica INDETERMINADO (falta o outro
    // dado), nunca afirmado como exceção aplicável.
    if (f.origemMP1314RecursosLivresDirecionados === false) {
      temExclusao = true;
      itens.push({
        requisito: "Não contratada ao amparo da MP nº 1.314/2025 (salvo exceção do § 8º, II)",
        artigo: "Art. 1º, § 8º, II",
        atende: false,
        observacao: "EXCLUSÃO: contratada sob a MP 1.314/2025 e não são recursos livres/direcionados — a exceção do § 8º, II não se aplica.",
      });
    } else {
      itens.push({
        requisito: "Não contratada ao amparo da MP nº 1.314/2025 (salvo exceção do § 8º, II)",
        artigo: "Art. 1º, § 8º, II",
        atende: "INDETERMINADO",
        observacao: f.origemMP1314RecursosLivresDirecionados
          ? "Recursos livres/direcionados confirmados, mas o § 8º, II também exige respeitar \"os limites por mutuário estabelecidos\" — esse limite é de resolução do CMN não localizada nesta análise, não da própria MP. Confirme na resolução antes de aplicar a exceção."
          : "Confirme se são recursos livres/direcionados das instituições financeiras — só nesse caso o § 8º, II abre exceção à vedação, e mesmo assim sujeita a limites por mutuário fora do texto desta MP.",
      });
    }
  }

  if (f.encaminhadoDividaAtivaUniao === null) {
    itens.push({ requisito: "Não encaminhada para a Dívida Ativa da União", artigo: "Art. 1º, § 9º", atende: "INDETERMINADO", observacao: "Confirme se a operação foi encaminhada à Dívida Ativa da União." });
  } else if (f.encaminhadoDividaAtivaUniao) {
    temExclusao = true;
    itens.push({ requisito: "Não encaminhada para a Dívida Ativa da União", artigo: "Art. 1º, § 9º", atende: false, observacao: "EXCLUSÃO: a MP não se aplica a operações já na Dívida Ativa da União." });
  }

  return { temExclusao, itens };
}

/** Art. 1º, § 4º, IV — a nova linha desta MP precisa ser contratada em até 120 dias da publicação (15/07/2026). */
function checarPrazoContratacao(f: FatosContrato, limiteContratacao: Date): { temExclusao: boolean; item: ItemChecklist } {
  const requisito = `Linha de composição contratada até ${limiteContratacao.toISOString().slice(0, 10)} (120 dias da publicação)`;
  const artigo = "Art. 1º, § 4º, IV";

  if (!f.dataContratacaoNovaLinha) {
    return {
      temExclusao: false,
      item: { requisito, artigo, atende: "INDETERMINADO", observacao: "Informe a data em que a nova linha de composição (desta MP) foi ou será contratada — sem ela o prazo de 120 dias não pode ser conferido." },
    };
  }

  const dentroDoPrazo = f.dataContratacaoNovaLinha <= limiteContratacao;
  return {
    temExclusao: !dentroDoPrazo,
    item: {
      requisito,
      artigo,
      atende: dentroDoPrazo,
      observacao: dentroDoPrazo
        ? "Contratada dentro do prazo de 120 dias."
        : `EXCLUSÃO: a nova linha foi (ou será) contratada em ${f.dataContratacaoNovaLinha.toISOString().slice(0, 10)}, depois do prazo de 120 dias da publicação.`,
    },
  };
}

/** Art. 1º, § 1º e § 7º — a perda de safra só conta se registrada entre 2019 e 2025; confere a janela, não só a contagem. */
function checarJanelaSafras(f: FatosContrato): ItemChecklist | null {
  if (!f.anosSafrasComPerda || f.anosSafrasComPerda.length === 0) return null;

  const requisito = "Anos das safras com perda dentro da janela de 2019 a 2025";
  const artigo = "Art. 1º, § 1º e § 7º";

  const anosInvalidos: string[] = [];
  const anosNumericos: number[] = [];
  for (const bruto of f.anosSafrasComPerda) {
    const ano = Number(String(bruto).trim());
    if (!Number.isInteger(ano)) {
      anosInvalidos.push(String(bruto));
      continue;
    }
    anosNumericos.push(ano);
    if (ano < SAFRA_ANO_MIN || ano > SAFRA_ANO_MAX) anosInvalidos.push(String(bruto));
  }

  if (anosInvalidos.length > 0) {
    return {
      requisito,
      artigo,
      atende: false,
      observacao: `Os seguintes anos declarados não são um número válido dentro de 2019–2025: ${anosInvalidos.join(", ")}. A MP só alcança perda de safra registrada nessa janela — reveja os anos informados antes de contar essas safras no total.`,
    };
  }

  // Contagem informativa: a lista de anos não precisa ter o mesmo tamanho
  // do número declarado (o produtor pode ter perdido mais safras do que
  // decidiu usar na composição), mas se a lista tiver MAIS anos distintos
  // do que o número declarado, vale um alerta — pode ser erro de digitação
  // em um dos dois campos.
  const distintos = new Set(anosNumericos).size;
  if (f.numeroSafrasComPerda !== null && distintos > f.numeroSafrasComPerda) {
    return {
      requisito,
      artigo,
      atende: "INDETERMINADO",
      observacao: `Foram listados ${distintos} anos distintos (${f.anosSafrasComPerda.join(", ")}), mas o número de safras com perda informado é ${f.numeroSafrasComPerda} — confira se os dois campos estão consistentes.`,
    };
  }

  return { requisito, artigo, atende: true, observacao: `Anos declarados (${f.anosSafrasComPerda.join(", ")}) dentro da janela de 2019 a 2025.` };
}

/** Art. 1º, §§ 5º e 6º — faixa adicional de crédito para PRONAF/PRONAMP que excedem o limite normal do § 4º. */
function checarLimiteCredito(f: FatosContrato, condicoes: CondicoesAplicaveis | null): ItemChecklist | null {
  if (!condicoes) return null;

  const requisito = "Valor da operação dentro do limite de crédito da modalidade (ou da faixa adicional, quando cabível)";
  const artigo = condicoes.artigo;

  if (f.valorOperacao === null) {
    return { requisito, artigo, atende: "INDETERMINADO", observacao: "Informe o valor da operação para conferir contra o limite de crédito da modalidade." };
  }

  if (f.valorOperacao <= condicoes.limiteCredito) {
    return { requisito, artigo, atende: true, observacao: `Valor da operação (${moeda(f.valorOperacao)}) dentro do limite de ${moeda(condicoes.limiteCredito)}.` };
  }

  if (condicoes.faixaAdicional) {
    const tetoComAdicional = condicoes.limiteCredito + condicoes.faixaAdicional.limite;
    if (f.valorOperacao <= tetoComAdicional) {
      return {
        requisito,
        artigo: `${artigo}; ${condicoes.faixaAdicional.artigo}`,
        atende: "INDETERMINADO",
        observacao:
          `Valor da operação (${moeda(f.valorOperacao)}) excede o limite normal de ${moeda(condicoes.limiteCredito)}, mas está dentro do teto combinado com a faixa ` +
          `adicional dos §§ 5º/6º (até ${moeda(tetoComAdicional)}). A faixa adicional é uma operação à parte, sujeita à taxa de ${condicoes.faixaAdicional.taxaJurosAnual}% a.a. ` +
          `sobre o que exceder ${moeda(condicoes.limiteCredito)} — confirme com a instituição financeira como a composição está sendo estruturada antes de tratar isso como atendido.`,
      };
    }
    return {
      requisito,
      artigo: `${artigo}; ${condicoes.faixaAdicional.artigo}`,
      atende: false,
      observacao: `Valor da operação (${moeda(f.valorOperacao)}) excede até o teto combinado com a faixa adicional (${moeda(tetoComAdicional)}). O excedente não tem amparo identificado no texto desta MP.`,
    };
  }

  return {
    requisito,
    artigo,
    atende: false,
    observacao: `Valor da operação (${moeda(f.valorOperacao)}) excede o limite de ${moeda(condicoes.limiteCredito)} desta categoria/modalidade, que não tem faixa adicional identificada no texto da MP.`,
  };
}

export function analisarEnquadramentoMP1376(f: FatosContrato): ResultadoMp1376 {
  const limiteContratacao = new Date(PUBLICACAO.getTime() + PRAZO_CONTRATACAO_DIAS * 86_400_000);

  const { resultado: operacaoElegivel, item: itemOperacao } = checarOperacaoElegivel(f);
  const { modalidade, resultado: beneficiarioElegivel, itens: itensBeneficiario } = checarBeneficiario(f);
  const { temExclusao: temExclusaoOriginaria, itens: itensExclusao } = checarExclusoes(f);
  const { temExclusao: prazoExcedido, item: itemPrazo } = checarPrazoContratacao(f, limiteContratacao);
  const temExclusao = temExclusaoOriginaria || prazoExcedido;

  const checklist: ItemChecklist[] = [itemOperacao, ...itensBeneficiario, ...itensExclusao, itemPrazo];

  const itemJanelaSafras = checarJanelaSafras(f);
  if (itemJanelaSafras) checklist.push(itemJanelaSafras);

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

  const itemLimiteCredito = checarLimiteCredito(f, condicoes);
  if (itemLimiteCredito) checklist.push(itemLimiteCredito);

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
    prazoContratacaoLimite: limiteContratacao.toISOString().slice(0, 10),
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
