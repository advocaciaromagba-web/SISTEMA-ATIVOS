/** Planos de assinatura do Agrojud (análise contratual rural). */
export type PlanoAgro = {
  chave: string;
  nome: string;
  paraQuem: string;
  precoMensal: number;
  precoAnual: number;
  destaque?: boolean;
  inclui: string[];
  naoInclui?: string[];
};

export const PLANOS_AGRO: PlanoAgro[] = [
  {
    chave: "ESSENCIAL",
    nome: "Essencial",
    paraQuem: "Para advogado que atende produtor rural de vez em quando.",
    precoMensal: 147,
    precoAnual: 1470,
    inclui: [
      "Até 10 contratos analisados por mês",
      "Enquadramento como crédito rural (Lei 4.829/65)",
      "Checklist de enquadramento na MP 1.376/2026, artigo por artigo",
      "Análise de taxas e garantias declaradas",
    ],
    naoInclui: ["Leitura automática do PDF por IA", "Mais de um usuário"],
  },
  {
    chave: "PROFISSIONAL",
    nome: "Profissional",
    paraQuem: "Para escritório que atende agronegócio como parte da rotina.",
    precoMensal: 347,
    precoAnual: 3470,
    destaque: true,
    inclui: [
      "Tudo do Essencial",
      "Até 50 contratos analisados por mês",
      "Leitura automática do PDF por IA — rascunho pra revisar, nunca decide sozinha",
      "Análise de seguro rural e coberturas",
      "3 usuários com permissões separadas",
    ],
  },
  {
    chave: "MESA",
    nome: "Mesa",
    paraQuem: "Para escritório ou assessoria com volume de contratos rurais.",
    precoMensal: 897,
    precoAnual: 8970,
    inclui: [
      "Tudo do Profissional",
      "Contratos analisados sem limite",
      "10 usuários",
      "Suporte prioritário",
    ],
  },
];
