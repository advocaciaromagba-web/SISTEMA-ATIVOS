/** Planos de assinatura da solução de Verificação de Documentos. */
export type PlanoVerificacao = {
  chave: string;
  nome: string;
  paraQuem: string;
  precoMensal: number;
  precoAnual: number;
  destaque?: boolean;
  inclui: string[];
  naoInclui?: string[];
};

export const PLANOS_VERIFICACAO: PlanoVerificacao[] = [
  {
    chave: "ESSENCIAL",
    nome: "Essencial",
    paraQuem: "Para quem recebe documento de fornecedor ou cliente de vez em quando.",
    precoMensal: 147,
    precoAnual: 1470,
    inclui: [
      "Até 20 documentos verificados por mês",
      "Impressão digital (hash) de cada arquivo",
      "Controle de validade com aviso antes de vencer",
    ],
    naoInclui: ["Leitura automática por IA", "Mais de um usuário"],
  },
  {
    chave: "PROFISSIONAL",
    nome: "Profissional",
    paraQuem: "Para quem recebe documentação de terceiros como rotina do negócio.",
    precoMensal: 347,
    precoAnual: 3470,
    destaque: true,
    inclui: [
      "Tudo do Essencial",
      "Até 100 documentos verificados por mês",
      "Leitura automática por IA: tipo, dados principais e validade extraídos do arquivo",
      "3 usuários com permissões separadas",
    ],
  },
  {
    chave: "MESA",
    nome: "Mesa",
    paraQuem: "Para departamento com volume de documentos de terceiros.",
    precoMensal: 897,
    precoAnual: 8970,
    inclui: [
      "Tudo do Profissional",
      "Documentos verificados sem limite",
      "10 usuários",
      "Suporte prioritário",
    ],
  },
];
