/** Planos de assinatura da solução de Due Diligence de Pessoas. */
export type PlanoDiligencia = {
  chave: string;
  nome: string;
  paraQuem: string;
  precoMensal: number;
  precoAnual: number;
  destaque?: boolean;
  inclui: string[];
  naoInclui?: string[];
};

export const PLANOS_DILIGENCIA: PlanoDiligencia[] = [
  {
    chave: "ESSENCIAL",
    nome: "Essencial",
    paraQuem: "Para quem verifica sócio, procurador ou garantidor de vez em quando.",
    precoMensal: 147,
    precoAnual: 1470,
    inclui: [
      "Até 10 pessoas verificadas por mês",
      "Sanções internacionais e dívida ativa da União",
      "Parecer de risco automático, com o que não foi possível verificar em destaque",
    ],
    naoInclui: ["Bureau de crédito", "Mais de um usuário"],
  },
  {
    chave: "PROFISSIONAL",
    nome: "Profissional",
    paraQuem: "Para quem verifica pessoa física como parte da rotina de fechar negócio.",
    precoMensal: 347,
    precoAnual: 3470,
    destaque: true,
    inclui: [
      "Tudo do Essencial",
      "Até 50 pessoas verificadas por mês",
      "Bureau de crédito: protesto, negativação, recuperação judicial",
      "3 usuários com permissões separadas",
    ],
  },
  {
    chave: "MESA",
    nome: "Mesa",
    paraQuem: "Para equipe de compliance ou jurídico com volume.",
    precoMensal: 897,
    precoAnual: 8970,
    inclui: [
      "Tudo do Profissional",
      "Pessoas verificadas sem limite",
      "10 usuários",
      "Suporte prioritário",
    ],
  },
];
