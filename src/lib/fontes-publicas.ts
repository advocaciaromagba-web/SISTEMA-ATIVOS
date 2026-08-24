/**
 * O que a plataforma consulta — e o que ela não consulta.
 *
 * Esta lista alimenta a página pública de fontes. Ela existe por um motivo
 * comercial e um ético, e os dois apontam para o mesmo lugar: quem contrata uma
 * verificação precisa saber onde ela olhou. Plataforma que promete "consulta
 * completa" sem dizer em quê está vendendo uma sensação, não um serviço.
 *
 * Quando uma fonte nova for ligada, ela entra aqui. Quando uma parar de
 * funcionar, a linha muda aqui. A página pública nunca é escrita à mão.
 */

export type Fonte = {
  nome: string;
  orgao: string;
  oQueMostra: string;
  /** AUTOMATICA = o sistema consulta sozinho; CERTIDAO = a parte precisa apresentar. */
  modo: "AUTOMATICA" | "CERTIDAO" | "CONTRATADA";
  /** Com que frequência o dado é atualizado na origem. */
  atualizacao: string;
  /** Quando exige configuração ou contrato para funcionar. */
  requer?: string;
};

export const FONTES_AUTOMATICAS: Fonte[] = [
  {
    nome: "Cadastro Nacional da Pessoa Jurídica",
    orgao: "Receita Federal",
    oQueMostra:
      "Situação cadastral (ativa, suspensa, inapta, baixada) e o motivo, data de abertura, capital social, " +
      "porte, enquadramento tributário, atividade e quadro societário completo.",
    modo: "AUTOMATICA",
    atualizacao: "Diária, na origem.",
  },
  {
    nome: "Dívida Ativa da União",
    orgao: "Procuradoria-Geral da Fazenda Nacional",
    oQueMostra:
      "Inscrições em dívida ativa, valor consolidado, situação de cada uma e se já foi ajuizada. Cobre FGTS, " +
      "contribuições previdenciárias e tributos federais.",
    modo: "AUTOMATICA",
    atualizacao: "Trimestral — é a periodicidade com que a PGFN publica a base.",
  },
  {
    nome: "Listas internacionais de sanções",
    orgao: "OFAC — Departamento do Tesouro dos Estados Unidos",
    oQueMostra:
      "Pessoas e empresas sancionadas. Importa em operação com componente externo: parte sancionada não é " +
      "liquidada por banco nenhum que opere em dólar.",
    modo: "AUTOMATICA",
    atualizacao: "Diária.",
  },
  {
    nome: "Cadastros de empresas punidas",
    orgao: "Controladoria-Geral da União",
    oQueMostra:
      "CEIS (empresas inidôneas e suspensas de contratar com a administração pública), CNEP (punidas pela Lei " +
      "Anticorrupção) e CEPIM (impedidas de firmar convênios).",
    modo: "AUTOMATICA",
    atualizacao: "Diária.",
    requer: "Chave gratuita do Portal da Transparência.",
  },
  {
    nome: "Processos judiciais",
    orgao: "DataJud — Conselho Nacional de Justiça",
    oQueMostra:
      "Existência do processo, tribunal, órgão julgador, classe, assunto e toda a movimentação. Cobre tribunais " +
      "estaduais, federais, do trabalho e superiores.",
    modo: "AUTOMATICA",
    atualizacao: "Contínua.",
    requer: "Chave pública gratuita do CNJ. Não traz as partes do processo — o CNJ as remove por privacidade.",
  },
];

export const FONTES_CONTRATADAS: Fonte[] = [
  {
    nome: "Bureau de crédito",
    orgao: "Serasa Experian ou equivalente",
    oQueMostra:
      "Protestos, pendências financeiras, dívida ativa, cheques sem fundo, ações judiciais, falência, " +
      "recuperação judicial, faturamento presumido e pontuação de crédito. É a única fonte que mede capacidade " +
      "de pagamento de verdade, e a única que alcança pessoa física.",
    modo: "CONTRATADA",
    atualizacao: "Em tempo real.",
    requer: "Contrato comercial do assinante ou da plataforma com o bureau. Cobrado por consulta.",
  },
];

/**
 * O que NÃO é consultável automaticamente no Brasil — e por quê.
 *
 * Esta seção é a mais importante da página. Ela é o que separa uma verificação
 * honesta de uma promessa vazia.
 */
export const NAO_AUTOMATIZAVEL: Array<{ assunto: string; porQue: string; comoResolvemos: string }> = [
  {
    assunto: "Antecedentes criminais",
    porQue: "O sistema da Polícia Federal é protegido contra acesso automatizado.",
    comoResolvemos:
      "A certidão é exigida da parte, com link direto para a página de emissão. O arquivo é guardado e lido " +
      "automaticamente pelo sistema.",
  },
  {
    assunto: "Mandados de prisão em aberto",
    porQue:
      "O Banco Nacional de Mandados de Prisão do CNJ responde apenas a requisições autenticadas, e a " +
      "credencial não é fornecida publicamente.",
    comoResolvemos: "Consulta feita pela própria parte no portal do CNJ, com o comprovante anexado à operação.",
  },
  {
    assunto: "Distribuições cíveis e criminais nos tribunais",
    porQue: "Os portais de certidão dos tribunais exigem resolução de captcha.",
    comoResolvemos:
      "O sistema aponta o tribunal certo conforme o domicílio da parte, leva direto à página da certidão e lê " +
      "o PDF depois de emitido.",
  },
  {
    assunto: "Débitos trabalhistas",
    porQue:
      "O Banco Nacional de Devedores Trabalhistas não é publicado em base aberta; só é consultável pela " +
      "certidão do Tribunal Superior do Trabalho, que exige captcha.",
    comoResolvemos: "Certidão exigida da parte, com link direto e leitura automática.",
  },
  {
    assunto: "CADIN federal",
    porQue:
      "A Lei 10.522/2002 restringe a consulta aos órgãos e entidades da administração pública federal. " +
      "Nenhum particular — nem bureau — tem acesso.",
    comoResolvemos: "Apenas a própria parte extrai o relatório, no e-CAC, e o entrega.",
  },
  {
    assunto: "Ano orçamentário e ordem cronológica do precatório",
    porQue:
      "Essa informação vive no sistema de precatórios de cada tribunal, e não existe base nacional aberta que " +
      "a reúna.",
    comoResolvemos:
      "A certidão de situação do precatório é exigida, e o sistema extrai dela o ano orçamentário, o valor e " +
      "as cessões já averbadas.",
  },
  {
    assunto: "Situação financeira real das partes",
    porQue:
      "Contabilidade, contratos privados e obrigações não registradas em base pública não são acessíveis a " +
      "ninguém de fora.",
    comoResolvemos:
      "O que o sistema mede pelo cadastro público é indício — capital social, porte, enquadramento. A medição " +
      "de verdade depende de bureau contratado ou de documentos apresentados pela parte.",
  },
];
