/**
 * Enquadramento como operação de crédito rural — verificação anterior e
 * separada do enquadramento na MP 1.376: primeiro confere se o contrato é,
 * de fato, uma operação de crédito rural; só depois faz sentido perguntar
 * se ela se enquadra na MP.
 *
 * FONTE: Lei nº 4.829, de 5 de novembro de 1965 (institucionaliza o crédito
 * rural), art. 3º — objetivos específicos do crédito rural — e as quatro
 * finalidades clássicas (custeio, investimento, comercialização,
 * industrialização), disciplinadas em detalhe pelo Manual de Crédito Rural
 * do Banco Central (MCR), que é atualizado periodicamente pelo Bacen —
 * confira a versão vigente do MCR para o caso concreto, este motor não
 * substitui essa consulta.
 */

export type CategoriaOperacao = "CUSTEIO" | "COMERCIALIZACAO" | "INDUSTRIALIZACAO" | "INVESTIMENTO";

export type FatosCreditoRural = {
  categoriaOperacao: CategoriaOperacao | null;
  /// Quem tomou o crédito é produtor rural (pessoa física ou jurídica) ou
  /// cooperativa de produção agropecuária, na qualidade de produtor.
  mutuarioEProdutorOuCooperativa: boolean | null;
  /// A finalidade declarada no contrato é atividade agropecuária (não
  /// capital de giro genérico, consumo, ou outra finalidade não-rural).
  finalidadeERural: boolean | null;
  fonteRecursos: string | null;
};

export type ItemChecklistCreditoRural = {
  requisito: string;
  fonte: string;
  atende: boolean | "INDETERMINADO";
  observacao: string;
};

export type ResultadoCreditoRural = {
  enquadraComoCreditoRural: boolean | "INDETERMINADO";
  checklist: ItemChecklistCreditoRural[];
};

const DEFINICOES_FINALIDADE: Record<CategoriaOperacao, string> = {
  CUSTEIO: "Cobrir despesas normais de um ou mais períodos de produção agrícola ou pecuária.",
  INVESTIMENTO: "Inversões em bens e serviços cujo desfrute se realiza ao longo de vários períodos de produção.",
  COMERCIALIZACAO: "Cobrir despesas da fase posterior à colheita: estocagem, transporte ou monetização de títulos oriundos da venda pelo produtor.",
  INDUSTRIALIZACAO: "Industrialização de produtos agropecuários, feita por cooperativa ou pelo produtor na própria propriedade rural.",
};

export function analisarEnquadramentoCreditoRural(f: FatosCreditoRural): ResultadoCreditoRural {
  const checklist: ItemChecklistCreditoRural[] = [];

  if (f.categoriaOperacao === null) {
    checklist.push({
      requisito: "Finalidade classificada em uma das 4 modalidades de crédito rural",
      fonte: "Lei nº 4.829/65, art. 3º; Manual de Crédito Rural (Bacen)",
      atende: "INDETERMINADO",
      observacao: "Não foi possível identificar se é custeio, investimento, comercialização ou industrialização.",
    });
  } else {
    checklist.push({
      requisito: `Finalidade classificada como ${f.categoriaOperacao.toLowerCase()}`,
      fonte: "Lei nº 4.829/65, art. 3º; Manual de Crédito Rural (Bacen)",
      atende: true,
      observacao: DEFINICOES_FINALIDADE[f.categoriaOperacao],
    });
  }

  if (f.mutuarioEProdutorOuCooperativa === null) {
    checklist.push({
      requisito: "Mutuário é produtor rural ou cooperativa de produção agropecuária",
      fonte: "Lei nº 4.829/65, art. 3º; MP nº 1.376/2026, art. 1º, § 1º",
      atende: "INDETERMINADO",
      observacao: "Confirme a qualificação do mutuário no contrato.",
    });
  } else {
    checklist.push({
      requisito: "Mutuário é produtor rural ou cooperativa de produção agropecuária",
      fonte: "Lei nº 4.829/65, art. 3º; MP nº 1.376/2026, art. 1º, § 1º",
      atende: f.mutuarioEProdutorOuCooperativa,
      observacao: f.mutuarioEProdutorOuCooperativa ? "Confirmado no contrato." : "O contrato não qualifica o mutuário como produtor rural ou cooperativa — checar se realmente é crédito rural.",
    });
  }

  if (f.finalidadeERural === null) {
    checklist.push({
      requisito: "Recursos destinados a atividade agropecuária, não a outra finalidade",
      fonte: "Lei nº 4.829/65, art. 3º",
      atende: "INDETERMINADO",
      observacao: "Confirme a destinação efetiva dos recursos no contrato.",
    });
  } else {
    checklist.push({
      requisito: "Recursos destinados a atividade agropecuária, não a outra finalidade",
      fonte: "Lei nº 4.829/65, art. 3º",
      atende: f.finalidadeERural,
      observacao: f.finalidadeERural ? "Destinação rural confirmada." : "A destinação declarada não parece ser rural — reveja o enquadramento.",
    });
  }

  const algumFalha = checklist.some((i) => i.atende === false);
  const algumIndeterminado = checklist.some((i) => i.atende === "INDETERMINADO");
  const enquadraComoCreditoRural: boolean | "INDETERMINADO" = algumFalha ? false : algumIndeterminado ? "INDETERMINADO" : true;

  return { enquadraComoCreditoRural, checklist };
}
