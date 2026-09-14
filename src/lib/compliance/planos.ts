/**
 * Planos de assinatura da solução de Compliance e Due Diligence — separados
 * dos planos da Gestão de Ativos e de Licitações.
 *
 * Empresas (CNPJ) e pessoas físicas (CPF) são a mesma assinatura desde a
 * fusão de 14/09/2026: mesma cota, mesmo preço, duas telas. O que muda por
 * tipo de parte é só o que cada fonte consulta.
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
    paraQuem: "Para quem verifica empresa ou pessoa de vez em quando, antes de contratar ou vender a prazo.",
    precoMensal: 147,
    precoAnual: 1470,
    inclui: [
      "Até 10 verificações por mês, empresas e pessoas somadas",
      "Situação cadastral, dívida ativa, sanções e CNDT (empresa)",
      "Sanções internacionais e dívida ativa da União (pessoa física)",
      "Certidões anexadas e controladas por prazo de validade",
      "Parecer de risco automático",
    ],
    naoInclui: ["Relatório de compliance assinado", "Bureau de crédito", "Mais de um usuário"],
  },
  {
    chave: "PROFISSIONAL",
    nome: "Profissional",
    paraQuem: "Para quem faz verificação de contraparte — empresa e sócios — como rotina do negócio.",
    precoMensal: 347,
    precoAnual: 3470,
    destaque: true,
    inclui: [
      "Tudo do Essencial",
      "Até 50 verificações por mês, empresas e pessoas somadas",
      "Relatório de compliance assinado, com escopo declarado",
      "Bureau de crédito: protesto, negativação, recuperação judicial",
      "3 usuários com permissões separadas",
    ],
  },
  {
    chave: "MESA",
    nome: "Mesa",
    paraQuem: "Para departamento de compliance ou jurídico com volume e equipe.",
    precoMensal: 897,
    precoAnual: 8970,
    inclui: [
      "Tudo do Profissional",
      "Verificações sem limite, empresas e pessoas",
      "Relatórios de compliance ilimitados",
      "10 usuários",
      "Suporte prioritário",
    ],
  },
];
