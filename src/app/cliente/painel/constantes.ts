export type ResultadoAcao = { erro?: string; ok?: boolean };

export const PAINEL_DA_SOLUCAO: Record<string, string> = {
  GESTAO_ATIVOS: "/painel",
  LICITACOES: "/licitacoes/painel",
  COMPLIANCE_EMPRESA: "/compliance/painel",
  CONSULTA_CADASTRAL_SERASA: "/serasa/painel",
  DILIGENCIA_PESSOA: "/diligencia/painel",
  VERIFICACAO_DOCUMENTOS: "/verificacao/painel",
};
