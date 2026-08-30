/**
 * Planos de assinatura da solução de Compliance de Empresas — separados dos
 * planos da Gestão de Ativos e de Licitações.
 */
export type PlanoCompliance = {
  chave: string;
  nome: string;
  paraQuem: string;
  precoMensal: number;
  precoAnual: number;
  destaque?: boolean;
  inclui: string[];
  naoInclui?: string[];
};

export const PLANOS_COMPLIANCE: PlanoCompliance[] = [
  {
    chave: "ESSENCIAL",
    nome: "Essencial",
    paraQuem: "Para quem verifica empresa de vez em quando, antes de contratar ou vender a prazo.",
    precoMensal: 147,
    precoAnual: 1470,
    inclui: [
      "Até 10 empresas verificadas por mês",
      "Situação cadastral, dívida ativa, sanções e CNDT",
      "Certidões anexadas e controladas por prazo de validade",
      "Parecer de risco automático",
    ],
    naoInclui: ["Relatório de compliance assinado", "Mais de um usuário"],
  },
  {
    chave: "PROFISSIONAL",
    nome: "Profissional",
    paraQuem: "Para quem faz verificação de contraparte como rotina do negócio.",
    precoMensal: 347,
    precoAnual: 3470,
    destaque: true,
    inclui: [
      "Tudo do Essencial",
      "Até 50 empresas verificadas por mês",
      "Relatório de compliance assinado, com escopo declarado",
      "3 usuários com permissões separadas",
    ],
  },
  {
    chave: "MESA",
    nome: "Mesa",
    paraQuem: "Para departamento de compliance com volume e equipe.",
    precoMensal: 897,
    precoAnual: 8970,
    inclui: [
      "Tudo do Profissional",
      "Empresas verificadas sem limite",
      "Relatórios de compliance ilimitados",
      "10 usuários",
      "Suporte prioritário",
    ],
  },
];
