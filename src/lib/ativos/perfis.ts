/**
 * Perfil jurídico de cada ativo negociado na plataforma.
 *
 * NCNDA, cessão, mandato e diligência não são o mesmo documento com o nome do
 * ativo trocado. Precatório se cede sob o art. 100 da Constituição; crédito
 * federal esbarra no art. 74 da Lei 9.430/96, que não admite compensação com
 * crédito de terceiro; ouro tem risco de origem e regra própria de primeira
 * aquisição; commodity se compra e vende sob Incoterms e laudo de inspeção.
 * Quem trata tudo como "direito creditório" escreve contrato que não protege.
 *
 * Este arquivo concentra essa diferença num lugar só. Os geradores de documento
 * e a diligência leem daqui — nenhum deles carrega regra de ativo por dentro.
 *
 * A distinção central de toda cessão vem do art. 295 do Código Civil: o cedente
 * responde pela EXISTÊNCIA do crédito, não pela SOLVÊNCIA do devedor, salvo se
 * assumir isso expressamente. Todo perfil abaixo declara os dois lados dessa
 * linha, porque é exatamente onde as operações quebram.
 */

export type NaturezaNegocio = "CESSAO" | "COMPRA_VENDA" | "FORNECIMENTO";

export type PerfilAtivo = {
  /** Nome do ativo como aparece no contrato. */
  nome: string;
  /** Como o contrato nomeia o negócio: "cessão onerosa de...", "compra e venda de...". */
  objeto: string;
  /** Cessão de crédito, compra e venda de bem, ou fornecimento com entrega. */
  natureza: NaturezaNegocio;
  /** Quem entrega o ativo e quem recebe, no vocabulário próprio do ativo. */
  vocabulario: { transmitente: string; adquirente: string };
  /** Unidade de medida usual, quando o ativo é medido e não apenas valorado. */
  unidadePadrao?: string;
  /** O que a parte transmitente garante. Entra no contrato como obrigação. */
  garante: string[];
  /** O que ela NÃO garante. Entra no contrato como ressalva expressa. */
  naoGarante: string[];
  /** Documentos sem os quais a operação não deve avançar. */
  documentacao: string[];
  /** Base legal citada no preâmbulo e na cláusula de objeto. */
  fundamentos: string[];
  /**
   * O risco central do ativo, dito sem rodeio.
   * Aparece no contrato e no relatório de diligência.
   */
  riscoCentral: string;
  /** Advertências que o documento precisa carregar. */
  alertas: string[];
};

// =====================================================================
// Créditos judiciais e tributários
// =====================================================================

const PRECATORIO: PerfilAtivo = {
  nome: "Precatório",
  objeto: "cessão onerosa, total ou parcial, de crédito representado por precatório judicial",
  natureza: "CESSAO",
  vocabulario: { transmitente: "CEDENTE", adquirente: "CESSIONÁRIO" },
  garante: [
    "a existência, a liquidez e a certeza do crédito, na forma do art. 295 do Código Civil",
    "a legitimidade da titularidade e a regularidade da habilitação do titular perante o tribunal",
    "a inexistência de cessão, penhora, arresto, bloqueio, caução ou gravame anterior sobre o crédito",
    "a inexistência de ação rescisória ou impugnação em curso capaz de desconstituir o título",
  ],
  naoGarante: [
    "a data em que a entidade devedora efetuará o pagamento, que depende de dotação orçamentária e da ordem cronológica de apresentação",
    "a inexistência de compensação futura com débitos do credor originário perante a entidade devedora",
    "o valor final após a incidência de imposto de renda, contribuição previdenciária e demais retenções na fonte",
  ],
  documentacao: [
    "ofício requisitório ou cópia do precatório expedido",
    "certidão de objeto e pé do processo de origem",
    "certidão de trânsito em julgado",
    "comprovante de inscrição no orçamento da entidade devedora, com o exercício",
    "cálculo homologado e decisão que o homologou",
    "certidão de inexistência de cessão anterior, expedida pelo tribunal",
    "certidão sobre penhora, arresto ou bloqueio incidente sobre o crédito",
    "documento que destaque os honorários advocatícios, contratuais e sucumbenciais",
  ],
  fundamentos: [
    "art. 100, §§ 13 e 14, da Constituição Federal",
    "arts. 286 a 298 do Código Civil",
    "art. 3º da Emenda Constitucional nº 113/2021",
  ],
  riscoCentral:
    "O crédito é certo, mas a data do pagamento não é. Precatório inscrito em orçamento distante vale menos por " +
    "isso, e nenhuma cláusula transfere esse risco ao cedente.",
  alertas: [
    "A cessão só produz efeitos perante a entidade devedora e o tribunal depois de comunicada a ambos, por " +
      "petição nos autos de origem (art. 100, § 14, da Constituição Federal). Sem essa comunicação, o pagamento " +
      "continua sendo feito ao cedente.",
    "Honorários advocatícios destacados no ofício requisitório pertencem ao advogado e não integram o crédito " +
      "cedido. Verifique o destaque antes de calcular o valor da cessão.",
    "A cessão não altera a natureza alimentar ou comum do crédito nem a ordem cronológica já estabelecida " +
      "(art. 100, § 13, da Constituição Federal).",
  ],
};

const CREDITO_FEDERAL: PerfilAtivo = {
  nome: "Crédito tributário federal",
  objeto: "cessão onerosa de direitos creditórios de natureza tributária federal",
  natureza: "CESSAO",
  vocabulario: { transmitente: "CEDENTE", adquirente: "CESSIONÁRIO" },
  garante: [
    "a existência e a titularidade do direito creditório, na forma do art. 295 do Código Civil",
    "a regularidade e a integridade da documentação que instrui o crédito",
    "a inexistência de cessão anterior, penhora ou gravame sobre o crédito",
    "a higidez jurídica e documental do crédito até a data da efetiva cessão",
  ],
  naoGarante: [
    "a habilitação, a homologação ou a compensação do crédito perante a Receita Federal do Brasil ou a " +
      "Procuradoria-Geral da Fazenda Nacional",
    "o aproveitamento tributário, a monetização ou a recuperação econômica futura do crédito pelo adquirente",
    "a aceitação do crédito por qualquer órgão público em procedimento posterior à cessão",
  ],
  documentacao: [
    "decisão judicial transitada em julgado que reconheceu o crédito, ou processo administrativo de reconhecimento",
    "certidão de trânsito em julgado",
    "pedido de habilitação do crédito e respectivo despacho decisório",
    "demonstrativo do crédito e memória de cálculo",
    "certidão de objeto e pé do processo de origem",
    "comprovação da inexistência de cessão ou penhora anterior",
  ],
  fundamentos: [
    "arts. 286 a 298 do Código Civil",
    "art. 74 da Lei nº 9.430/1996",
    "art. 170 do Código Tributário Nacional",
  ],
  riscoCentral:
    "A legislação federal não admite compensação de débito próprio com crédito de terceiro (art. 74, § 12, II, " +
    "alínea a, da Lei nº 9.430/1996). Quem adquire crédito federal esperando compensar tributo próprio precisa " +
    "saber disso antes de assinar, e a estrutura da operação tem de responder a esse ponto por escrito.",
  alertas: [
    "A cessão transfere o direito creditório, não o direito de compensar. A forma de aproveitamento tem de ser " +
      "definida em instrumento próprio, com identificação de quem assume a obrigação de executá-la.",
    "Crédito ainda não habilitado perante a Receita Federal é expectativa de crédito, e o contrato deve dizer isso " +
      "com essas palavras.",
  ],
};

const CREDITO_ICMS: PerfilAtivo = {
  nome: "Crédito acumulado de ICMS",
  objeto: "transferência onerosa de crédito acumulado de ICMS",
  natureza: "CESSAO",
  vocabulario: { transmitente: "DETENTOR DO CRÉDITO", adquirente: "DESTINATÁRIO DO CRÉDITO" },
  garante: [
    "a existência e a titularidade do crédito acumulado, apurado na escrita fiscal",
    "a regularidade fiscal do detentor perante a Secretaria da Fazenda do estado de apuração",
    "a inexistência de transferência anterior do mesmo saldo",
  ],
  naoGarante: [
    "a autorização de transferência pela Secretaria da Fazenda, que se sujeita ao procedimento estadual próprio",
    "o prazo de deferimento do pedido de transferência",
    "a manutenção do saldo credor em caso de glosa, fiscalização ou revisão de apuração",
  ],
  documentacao: [
    "demonstrativo de apuração do crédito acumulado",
    "comprovante de geração e de apropriação do crédito no sistema da Secretaria da Fazenda",
    "certidão de regularidade fiscal estadual do detentor",
    "pedido de transferência protocolado e respectivo número",
    "comprovação da hipótese legal que autoriza a transferência",
  ],
  fundamentos: [
    "art. 25 da Lei Complementar nº 87/1996",
    "legislação estadual de regência e regulamento do ICMS do estado de apuração",
    "arts. 286 a 298 do Código Civil",
  ],
  riscoCentral:
    "O crédito só se transfere com autorização do fisco estadual. Enquanto o pedido não é deferido, não há ativo " +
    "transferível, e o pagamento antecipado fica exposto ao indeferimento.",
  alertas: [
    "A hipótese de transferência e o limite de valor variam por estado. Confirme a regra do estado de apuração " +
      "antes de fixar preço e prazo.",
    "Irregularidade fiscal do detentor costuma travar o pedido de transferência. A certidão estadual é condição, " +
      "não formalidade.",
  ],
};

const CREDITO_RURAL: PerfilAtivo = {
  nome: "Crédito rural / CPR",
  objeto: "cessão onerosa de Cédula de Produto Rural e dos direitos creditórios nela representados",
  natureza: "CESSAO",
  vocabulario: { transmitente: "CEDENTE", adquirente: "CESSIONÁRIO" },
  garante: [
    "a existência e a regularidade formal da cédula, com registro em entidade registradora competente",
    "a titularidade do crédito e a inexistência de endosso ou cessão anterior",
    "a constituição e a subsistência das garantias reais e fidejussórias vinculadas à cédula",
  ],
  naoGarante: [
    "a entrega do produto pelo emitente, nem a solvência dele",
    "o resultado da safra, a produtividade da área ou eventos climáticos",
    "a cotação do produto na data do vencimento",
  ],
  documentacao: [
    "via original ou eletrônica da CPR, com registro em entidade registradora autorizada",
    "comprovação do registro das garantias no cartório de registro de imóveis ou em entidade registradora",
    "matrícula atualizada do imóvel rural vinculado",
    "certidões cíveis, fiscais e trabalhistas do emitente e dos garantidores",
    "comprovação de seguro agrícola ou de garantia de safra, quando houver",
  ],
  fundamentos: ["Lei nº 8.929/1994, com as alterações da Lei nº 13.986/2020", "arts. 286 a 298 do Código Civil"],
  riscoCentral:
    "A CPR é promessa de entrega futura. O risco não é jurídico, é de safra e de solvência do emitente — e é o " +
    "adquirente quem o assume.",
  alertas: [
    "CPR sem registro em entidade registradora não vale contra terceiros. Confirme o registro antes de pagar.",
    "Garantia real não registrada na matrícula do imóvel não segue a cédula.",
  ],
};

const DIREITO_CREDITORIO: PerfilAtivo = {
  nome: "Direito creditório",
  objeto: "cessão onerosa de direitos creditórios",
  natureza: "CESSAO",
  vocabulario: { transmitente: "CEDENTE", adquirente: "CESSIONÁRIO" },
  garante: [
    "a existência e a titularidade do crédito, na forma do art. 295 do Código Civil",
    "a inexistência de cessão, penhora ou gravame anterior",
    "a regularidade da documentação que comprova o crédito",
  ],
  naoGarante: [
    "a solvência do devedor, salvo assunção expressa em cláusula própria (art. 296 do Código Civil)",
    "o prazo de recebimento",
  ],
  documentacao: [
    "instrumento que originou o crédito",
    "comprovação da relação jurídica com o devedor",
    "demonstrativo do saldo devedor atualizado",
    "certidão de inexistência de cessão anterior",
  ],
  fundamentos: ["arts. 286 a 298 do Código Civil"],
  riscoCentral:
    "O cedente responde pela existência do crédito, não pelo pagamento. Se a operação depende de o devedor pagar, " +
    "isso precisa estar precificado ou coberto por coobrigação expressa.",
  alertas: ["A cessão só tem eficácia perante o devedor depois de notificada a ele (art. 290 do Código Civil)."],
};

// =====================================================================
// Metais e mercadorias
// =====================================================================

const OURO: PerfilAtivo = {
  nome: "Ouro (Au)",
  objeto: "compra e venda de ouro",
  natureza: "COMPRA_VENDA",
  vocabulario: { transmitente: "VENDEDOR", adquirente: "COMPRADOR" },
  unidadePadrao: "grama",
  garante: [
    "a origem lícita e rastreável do metal, com cadeia de custódia documentada desde a extração ou a importação",
    "o teor declarado, comprovado por laudo de ensaio de laboratório independente",
    "a regularidade fiscal da operação, com nota fiscal eletrônica hábil",
    "a inexistência de gravame, penhor ou reivindicação de terceiro sobre o metal",
    "o recolhimento da Compensação Financeira pela Exploração de Recursos Minerais, quando devida",
  ],
  naoGarante: [
    "a cotação do metal na data da liquidação",
    "a aceitação do lote por refinaria, bolsa ou contraparte estrangeira específica",
    "o prazo de liberação em operações de exportação",
  ],
  documentacao: [
    "laudo de ensaio (assay) emitido por laboratório independente, com teor e massa",
    "nota fiscal eletrônica de aquisição e a cadeia completa das notas anteriores",
    "título minerário, permissão de lavra garimpeira ou licença ambiental da área de origem",
    "comprovação de recolhimento da CFEM",
    "identificação do lote, com numeração das barras e peso individual",
    "comprovação de custódia e do local de guarda do metal",
    "identificação da instituição autorizada que realizou a primeira aquisição, em ouro de garimpo",
  ],
  fundamentos: [
    "Lei nº 7.766/1989",
    "art. 153, § 5º, da Constituição Federal",
    "Decreto-Lei nº 227/1967 e Lei nº 13.575/2017",
    "Lei nº 9.613/1998",
    "arts. 481 e seguintes do Código Civil",
  ],
  riscoCentral:
    "O risco do ouro é a origem, não o preço. Metal sem cadeia de custódia documentada contamina toda a operação " +
    "e alcança quem comprou: o Supremo Tribunal Federal afastou a presunção de boa-fé na aquisição de ouro de " +
    "garimpo (ADI 7273), de modo que cabe ao adquirente verificar a procedência.",
  alertas: [
    "A primeira aquisição de ouro extraído em garimpo é privativa de instituição autorizada a operar no mercado " +
      "de câmbio. Compra feita fora dessa cadeia não se regulariza depois.",
    "Quem comercializa metais preciosos é pessoa obrigada perante o COAF (art. 9º, parágrafo único, da Lei nº " +
      "9.613/1998), com dever de identificar o cliente e de comunicar operação suspeita.",
    "Laudo de ensaio emitido pelo próprio vendedor não substitui laudo de laboratório independente.",
    "Ouro como ativo financeiro tem tributação própria, com incidência exclusiva do IOF na origem (art. 153, § 5º, " +
      "da Constituição Federal). Ouro como mercadoria segue outro regime — defina qual é o caso antes de fechar preço.",
  ],
};

const METAIS: PerfilAtivo = {
  nome: "Metais e minérios",
  objeto: "compra e venda de metais e produtos minerais",
  natureza: "COMPRA_VENDA",
  vocabulario: { transmitente: "VENDEDOR", adquirente: "COMPRADOR" },
  unidadePadrao: "tonelada métrica",
  garante: [
    "a origem lícita do produto e a titularidade do direito de lavra ou de comercialização",
    "a especificação química e física declarada, comprovada por laudo de análise independente",
    "a regularidade ambiental da área de origem",
    "o recolhimento da Compensação Financeira pela Exploração de Recursos Minerais, quando devida",
  ],
  naoGarante: [
    "a cotação do produto na data do embarque ou da liquidação",
    "a obtenção de licença de importação pelo comprador",
    "prazos portuários, disponibilidade de navio ou congestionamento de terminal",
  ],
  documentacao: [
    "laudo de análise química e granulométrica de laboratório independente",
    "título minerário ou registro na Agência Nacional de Mineração",
    "licença ambiental de operação vigente",
    "comprovação de recolhimento da CFEM",
    "guia de utilização ou documento equivalente que autorize a comercialização",
    "certificado de origem e documentos de transporte",
  ],
  fundamentos: [
    "Decreto-Lei nº 227/1967",
    "Lei nº 13.575/2017",
    "Lei nº 8.001/1990",
    "arts. 481 e seguintes do Código Civil",
  ],
  riscoCentral:
    "Produto mineral sem título minerário regular e sem licença ambiental vigente não é mercadoria negociável — é " +
    "passivo. A verificação é documental e precede qualquer discussão de preço.",
  alertas: [
    "Divergência entre o laudo do vendedor e a análise no destino é a causa mais comum de litígio. Defina no " +
      "contrato o laboratório árbitro e quem paga a contraprova.",
    "Especifique a tolerância de teor e a fórmula de ajuste de preço por variação de especificação.",
  ],
};

const COMMODITY: PerfilAtivo = {
  nome: "Commodity",
  objeto: "compra e venda de mercadoria",
  natureza: "COMPRA_VENDA",
  vocabulario: { transmitente: "VENDEDOR", adquirente: "COMPRADOR" },
  unidadePadrao: "tonelada métrica",
  garante: [
    "a existência, a disponibilidade e a titularidade da mercadoria ofertada",
    "a conformidade com a especificação contratada, comprovada por inspeção independente no local de embarque",
    "a regularidade da documentação de exportação ou de circulação",
  ],
  naoGarante: [
    "a variação de preço de mercado entre a assinatura e a liquidação",
    "a obtenção de licenças de importação, cotas ou autorizações no país de destino",
    "prazos de transporte, disponibilidade de praça ou eventos de força maior",
  ],
  documentacao: [
    "prova de produto ou de disponibilidade do lote",
    "certificado de inspeção emitido por empresa independente no porto de embarque",
    "certificado de origem",
    "certificado fitossanitário ou sanitário, conforme o produto",
    "conhecimento de embarque e demais documentos de transporte",
    "apólice de seguro da carga, conforme o Incoterm ajustado",
  ],
  fundamentos: [
    "arts. 481 e seguintes do Código Civil",
    "Convenção das Nações Unidas sobre Contratos de Compra e Venda Internacional de Mercadorias, promulgada pelo Decreto nº 8.327/2014",
    "Incoterms 2020, da Câmara de Comércio Internacional",
  ],
  riscoCentral:
    "O Incoterm decide onde o risco passa do vendedor para o comprador e quem paga frete e seguro. Contrato que " +
    "não fixa Incoterm, porto e data-limite de embarque deixa o ponto mais caro da operação em aberto.",
  alertas: [
    "Certificado de inspeção emitido pelo vendedor não substitui inspeção independente contratada pelo comprador.",
    "Defina o instrumento de pagamento — carta de crédito, standby ou pagamento contra documentos — antes de " +
      "assinar o contrato de compra e venda.",
  ],
};

// =====================================================================
// Outros
// =====================================================================

const IMOVEL: PerfilAtivo = {
  nome: "Imóvel",
  objeto: "compra e venda de bem imóvel",
  natureza: "COMPRA_VENDA",
  vocabulario: { transmitente: "VENDEDOR", adquirente: "COMPRADOR" },
  garante: [
    "a titularidade do domínio, comprovada por matrícula atualizada",
    "a inexistência de ônus, gravame, penhora ou ação real ou reipersecutória não declarados",
    "a inexistência de débitos de tributos e de despesas condominiais até a data da transmissão",
  ],
  naoGarante: ["a valorização futura do bem", "a aprovação de financiamento pelo adquirente"],
  documentacao: [
    "matrícula atualizada, expedida há menos de trinta dias",
    "certidão negativa de ônus reais",
    "certidões cíveis, fiscais, trabalhistas e de executivos fiscais dos vendedores",
    "certidão negativa de débitos de IPTU e de despesas condominiais",
    "comprovação do estado civil e outorga do cônjuge, quando exigível",
  ],
  fundamentos: ["arts. 481 e seguintes e arts. 1.245 a 1.247 do Código Civil", "Lei nº 6.015/1973"],
  riscoCentral:
    "A propriedade se transfere pelo registro, não pelo contrato (art. 1.245 do Código Civil). Até o registro, o " +
    "comprador tem obrigação, não domínio.",
  alertas: [
    "As certidões dos vendedores servem para aferir risco de fraude à execução. Colha-as das comarcas de domicílio " +
      "e da situação do imóvel.",
  ],
};

const PADRAO: PerfilAtivo = {
  nome: "Ativo",
  objeto: "negociação do ativo descrito neste instrumento",
  natureza: "CESSAO",
  vocabulario: { transmitente: "TRANSMITENTE", adquirente: "ADQUIRENTE" },
  garante: [
    "a existência e a titularidade do ativo",
    "a inexistência de gravame, ônus ou reivindicação de terceiro",
    "a regularidade da documentação que comprova o ativo",
  ],
  naoGarante: ["resultado econômico futuro, aproveitamento ou liquidez do ativo após a transmissão"],
  documentacao: [
    "documento que comprove a existência e a titularidade do ativo",
    "documento que comprove a inexistência de gravame",
  ],
  fundamentos: ["Código Civil"],
  riscoCentral:
    "Ativo sem perfil próprio cadastrado é analisado pela regra geral. Descreva o ativo com precisão no cadastro " +
    "para que o contrato e a diligência acompanhem.",
  alertas: ["Este ativo não tem regime específico cadastrado na plataforma. Revise o instrumento antes de assinar."],
};

// =====================================================================

const PERFIS: Record<string, PerfilAtivo> = {
  PRECATORIO,
  CREDITO_PIS_COFINS: { ...CREDITO_FEDERAL, nome: "Crédito de PIS/COFINS" },
  CREDITO_TRIBUTARIO: CREDITO_FEDERAL,
  CREDITO_ICMS,
  CREDITO_RURAL,
  CREDAQ: { ...DIREITO_CREDITORIO, nome: "CredAq / crédito de aquisição" },
  DIREITO_CREDITORIO,
  OURO,
  METAIS,
  COMMODITY,
  IMOVEL,
  OUTRO: PADRAO,
};

/** Perfil do ativo; cai no padrão quando o tipo não tem regime próprio. */
export function perfilDoAtivo(tipoAtivo: string | null | undefined): PerfilAtivo {
  if (!tipoAtivo) return PADRAO;
  return PERFIS[tipoAtivo] ?? PADRAO;
}

/** Se o ativo tem regime próprio ou está sendo tratado pela regra geral. */
export function temPerfilProprio(tipoAtivo: string | null | undefined): boolean {
  return !!tipoAtivo && tipoAtivo in PERFIS && PERFIS[tipoAtivo] !== PADRAO;
}

/** Vocabulário das partes conforme o ativo: cede-se crédito, vende-se metal. */
export function papeisDoAtivo(tipoAtivo: string | null | undefined): {
  transmitente: string;
  adquirente: string;
} {
  return perfilDoAtivo(tipoAtivo).vocabulario;
}
