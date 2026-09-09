/**
 * Roda os três motores determinísticos (crédito rural, MP 1.376,
 * alongamento) a partir dos fatos atuais do contrato.
 *
 * Existe separado da criação do contrato porque a análise precisa ser
 * refeita depois também: quando um anexo (laudo de frustração de safra, de
 * capacidade de pagamento) completa um fato que faltava, o parecer tem que
 * refletir isso — senão a tela continuaria dizendo "falta dado" com o dado
 * já ali, o que é pior que não ter a função de anexo nenhuma.
 */
import { analisarEnquadramentoCreditoRural, type FatosCreditoRural, type ResultadoCreditoRural } from "./credito-rural";
import { analisarEnquadramentoMP1376, type FatosContrato, type ResultadoMp1376 } from "./mp1376";
import { analisarAlongamento, type FatosAlongamento, type ResultadoAlongamento } from "./alongamento";

export type FatosParaAnalise = {
  categoriaOperacao: FatosContrato["categoriaOperacao"];
  mutuarioEProdutorOuCooperativa: boolean | null;
  finalidadeERural: boolean | null;
  fonteRecursos: string | null;
  dataContratacao: Date | null;
  foiRenegociadoOuProrrogado: boolean | null;
  dataRenegociacaoOuProrrogacao: Date | null;
  situacaoAdimplencia: FatosContrato["situacaoAdimplenciaNaContratacaoNovaLinha"];
  dataInicioInadimplencia: Date | null;
  permaneceInadimplenteEm31Mai2026: boolean | null;
  categoriaBeneficiario: FatosContrato["categoriaBeneficiario"];
  valorOperacao: number | null;
  numeroSafrasComPerda: number | null;
  percentualReducaoRenda: number | null;
  causaPerda: FatosContrato["causaPerda"];
  temLaudoTecnico: boolean | null;
  origemFundoSocial: boolean | null;
  origemMP1314_2025: boolean | null;
  encaminhadoDividaAtivaUniao: boolean | null;
  dataVencimento: Date | null;
  dataPedidoAlongamento: Date | null;
  hipotesesMcr: FatosAlongamento["hipotesesMcr"];
  laudoUnilateral: boolean | null;
  bancoConvidadoParaLaudo: boolean | null;
  houvePedidoAdministrativo: boolean | null;
  respostaBanco: FatosAlongamento["respostaBanco"];
  recusaFundamentadaPorEscrito: boolean | null;
};

export type ResultadoAnalise = {
  resultadoCreditoRural: ResultadoCreditoRural;
  resultadoMp1376: ResultadoMp1376;
  resultadoAlongamento: ResultadoAlongamento;
};

export function analisarContrato(f: FatosParaAnalise): ResultadoAnalise {
  const resultadoCreditoRural = analisarEnquadramentoCreditoRural({
    categoriaOperacao: f.categoriaOperacao,
    mutuarioEProdutorOuCooperativa: f.mutuarioEProdutorOuCooperativa,
    finalidadeERural: f.finalidadeERural,
    fonteRecursos: f.fonteRecursos,
  });

  const resultadoMp1376 = analisarEnquadramentoMP1376({
    categoriaOperacao: f.categoriaOperacao,
    dataContratacaoOriginal: f.dataContratacao,
    foiRenegociadoOuProrrogado: f.foiRenegociadoOuProrrogado,
    dataRenegociacaoOuProrrogacao: f.dataRenegociacaoOuProrrogacao,
    situacaoAdimplenciaNaContratacaoNovaLinha: f.situacaoAdimplencia,
    dataInicioInadimplencia: f.dataInicioInadimplencia,
    permaneceInadimplenteEm31Mai2026: f.permaneceInadimplenteEm31Mai2026,
    categoriaBeneficiario: f.categoriaBeneficiario,
    valorOperacao: f.valorOperacao,
    numeroSafrasComPerda: f.numeroSafrasComPerda,
    percentualReducaoRenda: f.percentualReducaoRenda,
    causaPerda: f.causaPerda,
    temLaudoTecnico: f.temLaudoTecnico,
    origemFundoSocial: f.origemFundoSocial,
    origemMP1314_2025: f.origemMP1314_2025,
    encaminhadoDividaAtivaUniao: f.encaminhadoDividaAtivaUniao,
  });

  const resultadoAlongamento = analisarAlongamento({
    dataContratacao: f.dataContratacao,
    dataVencimento: f.dataVencimento,
    dataPedidoAlongamento: f.dataPedidoAlongamento,
    hipotesesMcr: f.hipotesesMcr,
    temLaudoTecnico: f.temLaudoTecnico,
    laudoUnilateral: f.laudoUnilateral,
    bancoConvidadoParaLaudo: f.bancoConvidadoParaLaudo,
    houvePedidoAdministrativo: f.houvePedidoAdministrativo,
    respostaBanco: f.respostaBanco,
    recusaFundamentadaPorEscrito: f.recusaFundamentadaPorEscrito,
    categoriaBeneficiario: f.categoriaBeneficiario,
  });

  return { resultadoCreditoRural, resultadoMp1376, resultadoAlongamento };
}
