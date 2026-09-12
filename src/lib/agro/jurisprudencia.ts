/**
 * Catálogo de jurisprudência e doutrina sobre alongamento de dívida rural.
 *
 * Cada entrada tem `verificadoNaFontePrimaria`: só entra aqui, e só é citado
 * na petição, o que foi conferido na fonte oficial — não em blog, não em
 * resumo de terceiro. Onde a verificação foi só por fonte secundária, o campo
 * fica `false` e o texto avisa isso explicitamente: o advogado confere antes
 * de usar, o sistema nunca apresenta como certo o que não confirmou.
 *
 * FONTE PRIMÁRIA desta leva de precedentes: STJ, Revista de Súmulas
 * (RSSTJ), a. 5, (23): 315-358, outubro de 2011 — publicação oficial com o
 * inteiro teor dos acórdãos que originaram a Súmula 298, obtida em
 * stj.jus.br em 07/09/2026.
 *
 * FONTE PRIMÁRIA de `SUMULAS_ADICIONAIS_VERIFICADAS`: texto de cada súmula
 * conferido ao vivo em 12/09/2026 — Súmulas 121 e 596/STF diretamente em
 * portal.stf.jus.br/jurisprudencia/sumariosumulas.asp (página oficial do
 * STF, que também revela a ressalva da MP 2.170-36/2001 e o cruzamento entre
 * as duas súmulas); Súmula 472/STJ conferida em duas fontes institucionais
 * independentes do próprio STJ (arquivocidadao.stj.jus.br — arquivo
 * institucional — e stj.jus.br/sites/portalp — notícia oficial), com texto,
 * órgão julgador e datas coincidentes nas duas.
 */

export type Precedente = {
  identificacao: string;
  orgaoJulgador: string;
  relator: string;
  dataJulgamento: string;
  dataPublicacaoDJ: string;
  trecho: string;
  verificadoNaFontePrimaria: boolean;
  observacao?: string;
};

export type Doutrina = {
  autor: string;
  obra: string;
  dadosEdicao: string;
  trecho?: string;
  verificadoNaFontePrimaria: boolean;
};

/**
 * Súmula avulsa (sem um único acórdão-relator, como em `Precedente` —
 * enunciado do colegiado). `observacao` carrega, quando existe, uma ressalva
 * que muda o alcance prático da súmula — por exemplo, uma delas foi
 * relativizada por lei posterior para instituições do Sistema Financeiro
 * Nacional. Omitir essa ressalva na peça seria pior do que não citar a
 * súmula: viraria um argumento que a própria jurisprudência já afastou para
 * o tipo de réu desta ação (banco).
 */
export type Sumula = {
  numero: string;
  tribunal: "STF" | "STJ";
  orgaoJulgador?: string;
  texto: string;
  dataJulgamento?: string;
  dataPublicacao?: string;
  fonteConsulta: string;
  verificadoNaFontePrimaria: boolean;
  observacao?: string;
};

/** Precedentes que originaram a Súmula 298/STJ — todos com inteiro teor conferido na fonte primária. */
export const PRECEDENTES_SUMULA_298: Precedente[] = [
  {
    identificacao: "REsp 147.586-GO",
    orgaoJulgador: "4ª Turma",
    relator: "Min. Ruy Rosado de Aguiar",
    dataJulgamento: "03/09/1998",
    dataPublicacaoDJ: "07/12/1998",
    trecho:
      "Penso que a lei, autorizando o alongamento da dívida, concedeu ao devedor o direito de requerer o " +
      "benefício nela instituído, que não poderia ser denegado uma vez atendidos os pressupostos.",
    verificadoNaFontePrimaria: true,
  },
  {
    identificacao: "REsp 166.592-MG",
    orgaoJulgador: "4ª Turma",
    relator: "Min. Sálvio de Figueiredo Teixeira",
    dataJulgamento: "07/05/1998",
    dataPublicacaoDJ: "22/06/1998",
    trecho:
      "A securitização da dívida agrícola prevista na Lei n. 9.138/1995 consubstancia direito subjetivo do " +
      "devedor.",
    verificadoNaFontePrimaria: true,
  },
  {
    identificacao: "REsp 194.324-MG",
    orgaoJulgador: "3ª Turma",
    relator: "Min. Carlos Alberto Menezes Direito",
    dataJulgamento: "23/11/1999",
    dataPublicacaoDJ: "07/02/2000",
    trecho:
      "A 'Lei n. 9.138/1995 determinou aos bancos, uma vez preenchidos os seus requisitos, o alongamento das " +
      "dívidas rurais, e não permitiu simples faculdade a ser usada discricionariamente pela instituição de " +
      "crédito'.",
    verificadoNaFontePrimaria: true,
  },
  {
    identificacao: "REsp 234.246-SP",
    orgaoJulgador: "4ª Turma",
    relator: "Min. Aldir Passarinho Junior",
    dataJulgamento: "29/08/2000",
    dataPublicacaoDJ: "13/11/2000",
    trecho: "É direito do devedor, desde que atendidos os requisitos estipulados na Lei n. 9.138/1995, o alongamento das dívidas originárias de crédito rural.",
    verificadoNaFontePrimaria: true,
  },
  {
    identificacao: "REsp 525.651-MG",
    orgaoJulgador: "3ª Turma",
    relator: "Min. Nancy Andrighi",
    dataJulgamento: "14/10/2003",
    dataPublicacaoDJ: "10/11/2003",
    trecho:
      "Preenchidos os requisitos legais, o alongamento da dívida constitui um direito do devedor e não mera " +
      "faculdade das instituições financeiras. [...] Os contratos de securitização das dívidas rurais são " +
      "passíveis de revisão, [...] afastando-se cláusulas [de índice de correção] impróprias a esse fim.",
    verificadoNaFontePrimaria: true,
    observacao: "Precedente relevante por cumular, no mesmo caso, o pedido de securitização/alongamento com revisão contratual — mesma estrutura desta petição.",
  },
  {
    identificacao: "AgRg no Ag 320.989-RS",
    orgaoJulgador: "3ª Turma",
    relator: "Min. Ari Pargendler",
    dataJulgamento: "29/03/2001",
    dataPublicacaoDJ: "28/05/2001",
    trecho: "O alongamento das dívidas originárias de crédito rural constitui direito do devedor, desde que atendidos os requisitos previstos na Lei n. 9.138, de 1995.",
    verificadoNaFontePrimaria: true,
  },
  {
    identificacao: "AgRg no Ag 476.337-RS",
    orgaoJulgador: "3ª Turma",
    relator: "Min. Castro Filho",
    dataJulgamento: "25/02/2003",
    dataPublicacaoDJ: "17/03/2003",
    trecho:
      "Afirmado [...] que o devedor preenche os requisitos legais para a securitização de sua dívida rural, " +
      "estão ausentes os pressupostos indispensáveis da exigibilidade, certeza e liquidez do título executivo.",
    verificadoNaFontePrimaria: true,
  },
];

/** Doutrina citada dentro dos próprios acórdãos acima — texto conferido na mesma fonte primária. */
export const DOUTRINA_ALONGAMENTO: Doutrina[] = [
  {
    autor: "Luciano Sotero Santiago",
    obra: "A Securitização de Dívida Originária do Crédito Rural como Técnica de Intervenção do Estado no Domínio Econômico",
    dadosEdicao: "monografia, Professor de Direito Econômico da UFMG",
    trecho: "A Constituição [...] permite que o Judiciário imponha, desde que preenchidos os requisitos de lei, às instituições financeiras o alongamento da dívida agrária.",
    verificadoNaFontePrimaria: true,
  },
  {
    autor: "Lutero de Paiva Pereira",
    obra: "Securitização e Crédito Rural",
    dadosEdicao: "Juruá, 1997, n. 5.1, p. 77",
    trecho: "Exceção feita [a desvio de finalidade ou dolo], o pleito do produtor ao benefício legal não pode ser negado pelo credor.",
    verificadoNaFontePrimaria: true,
  },
  {
    autor: "Igor Pantuzza Wildmann",
    obra: "Aspectos Jurídicos da Securitização de Dívidas Rurais como Medida de Subvenção Econômica",
    dadosEdicao: "Movimento Editorial da Faculdade de Direito da UFMG, 1997, p. 31",
    trecho: "Satisfeitos os requisitos [...] e requerido tempestivamente o benefício, não pode a instituição financeira, por interesses diversos, denegar o alongamento de dívida rural, [...] verdadeiro direito subjetivo público do devedor.",
    verificadoNaFontePrimaria: true,
  },
];

/**
 * Jurisprudência citada apenas em fonte SECUNDÁRIA (artigo/comentário), sem
 * conferência direta do inteiro teor. Entra aqui para não desaparecer do
 * radar do advogado — mas com o aviso de que precisa ser checada antes de
 * ir para a peça.
 */
export const JURISPRUDENCIA_NAO_VERIFICADA: Precedente[] = [
  {
    identificacao: "TJSP, Apelação Cível 1001538-58.2022.8.26.0315",
    orgaoJulgador: "Tribunal de Justiça de São Paulo",
    relator: "não verificado",
    dataJulgamento: "não verificado",
    dataPublicacaoDJ: "não verificado",
    trecho:
      "Citado em artigo (Migalhas) como precedente que teria negado alongamento por entender a Súmula 298 " +
      "limitada a operações contratadas até 20/06/1995 (Lei 9.138/95).",
    verificadoNaFontePrimaria: false,
    observacao: "NÃO CONFIRMADO NA FONTE PRIMÁRIA (esaj.tjsp.jus.br). Não citar na peça sem antes conferir o inteiro teor.",
  },
];

/**
 * Súmulas adicionais, fora do núcleo "alongamento" acima, aplicáveis à
 * revisão de taxas e encargos (anatocismo, limite de juros bancários,
 * comissão de permanência). Cada uma tem o texto conferido ao vivo na fonte
 * oficial — ver nota no topo do arquivo.
 */
export const SUMULAS_ADICIONAIS_VERIFICADAS: Sumula[] = [
  {
    numero: "Súmula 121/STF",
    tribunal: "STF",
    texto: "É vedada a capitalização de juros, ainda que expressamente convencionada.",
    fonteConsulta:
      "portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=30&sumula=2000 (página oficial de aplicação das súmulas do STF), consultada ao vivo em 12/09/2026",
    verificadoNaFontePrimaria: true,
    observacao:
      "RESSALVA DA PRÓPRIA PÁGINA OFICIAL DO STF (Tema 33 de Repercussão Geral, RE 592.377): para operações do " +
      "Sistema Financeiro Nacional — como é o caso do banco réu nesta ação —, o art. 5º da MP nº 2.170-36/2001 " +
      "autoriza a capitalização de juros com periodicidade inferior a um ano, e essa autorização foi declarada " +
      "constitucional pelo STF. Ou seja: esta súmula NÃO pode ser usada para atacar uma capitalização já " +
      "expressamente pactuada e dentro do que a Súmula 93/STJ e o Decreto-Lei nº 167/67 permitem para crédito " +
      "rural (ver `taxas.ts`) — só serve para atacar capitalização SEM cláusula expressa, ou capitalização com " +
      "periodicidade além da pactuada.",
  },
  {
    numero: "Súmula 596/STF",
    tribunal: "STF",
    texto:
      "As disposições do Decreto 22.626/1933 não se aplicam às taxas de juros e aos outros encargos cobrados " +
      "nas operações realizadas por instituições públicas ou privadas, que integram o Sistema Financeiro Nacional.",
    dataPublicacao: "DJ de 5-1-1977",
    fonteConsulta:
      "portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=30&sumula=2017 (página oficial de aplicação das súmulas do STF), consultada ao vivo em 12/09/2026",
    verificadoNaFontePrimaria: true,
    observacao:
      "ALERTA, NÃO TESE: esta súmula afasta a Lei de Usura (limite de 12% a.a.) para bancos — ela DERRUBA, não " +
      "sustenta, qualquer argumento de que a taxa contratada seria abusiva só por superar 12% ao ano. A tese de " +
      "abusividade de taxa nesta peça só pode se apoiar na comparação com a taxa média do Banco Central " +
      "(`analise_taxas_e_encargos`), nunca na Lei de Usura.",
  },
  {
    numero: "Súmula 472/STJ",
    tribunal: "STJ",
    orgaoJulgador: "Segunda Seção",
    texto:
      "A cobrança de comissão de permanência — cujo valor não pode ultrapassar a soma dos encargos remuneratórios " +
      "e moratórios previstos no contrato — exclui a exigibilidade dos juros remuneratórios, moratórios e da " +
      "multa contratual.",
    dataJulgamento: "13/06/2012",
    dataPublicacao: "DJe de 19/06/2012",
    fonteConsulta:
      "arquivocidadao.stj.jus.br/index.php/sumula-472-2 (arquivo institucional do STJ) e " +
      "stj.jus.br/sites/portalp (notícia oficial do STJ) — texto, órgão julgador e datas coincidentes nas duas " +
      "fontes, consultadas ao vivo em 12/09/2026",
    verificadoNaFontePrimaria: true,
    observacao:
      "Resolve o ponto que faltava fundamentar em `taxas.ts`: se houver comissão de permanência cumulada com " +
      "juros remuneratórios, juros moratórios ou multa contratual (não só com correção monetária, que já é a " +
      "Súmula 30/STJ), a cumulação é vedada por esta súmula.",
  },
];
