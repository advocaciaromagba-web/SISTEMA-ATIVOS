/**
 * Planos de assinatura da solução de Licitações — separados dos planos da
 * Gestão de Ativos (`src/lib/planos.ts`). Mesma faixa de preço popular,
 * limites próprios do que esta solução realmente entrega.
 */
export type PlanoLicitacoes = {
  chave: string;
  nome: string;
  paraQuem: string;
  precoMensal: number;
  precoAnual: number;
  destaque?: boolean;
  inclui: string[];
  naoInclui?: string[];
};

export const PLANOS_LICITACOES: PlanoLicitacoes[] = [
  {
    chave: "ESSENCIAL",
    nome: "Essencial",
    paraQuem: "Para quem participa de poucos certames por mês, sozinho.",
    precoMensal: 147,
    precoAnual: 1470,
    inclui: [
      "Até 3 empresas licitantes cadastradas",
      "As cinco declarações de habilitação geradas do cadastro",
      "Auditoria automática do licitante (Receita, dívida ativa, sanções, CNDT)",
      "Documentos pessoais anexados e organizados",
      "10 envelopes gerados por mês",
    ],
    naoInclui: ["Busca automática de oportunidades no PNCP", "Mais de um usuário"],
  },
  {
    chave: "PROFISSIONAL",
    nome: "Profissional",
    paraQuem: "Para quem concorre com frequência, em mais de um município.",
    precoMensal: 347,
    precoAnual: 3470,
    destaque: true,
    inclui: [
      "Tudo do Essencial",
      "Até 15 empresas licitantes cadastradas",
      "Envelopes ilimitados",
      "Busca de oportunidades no PNCP por modalidade, UF e palavra-chave",
      "3 usuários com permissões separadas",
    ],
  },
  {
    chave: "MESA",
    nome: "Mesa",
    paraQuem: "Para quem presta serviço a vários licitantes, ou entes públicos com volume.",
    precoMensal: 897,
    precoAnual: 8970,
    inclui: [
      "Tudo do Profissional",
      "Empresas licitantes sem limite",
      "Frente do ente público: conferência de participantes e relatório da comissão",
      "10 usuários",
      "Suporte prioritário",
    ],
  },
];
