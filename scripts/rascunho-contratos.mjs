/**
 * Carrega RASCUNHOS de contrato, um por solução.
 *
 * Rascunho, não publicado: nada passa a valer sem alguém revisar e publicar
 * pela tela de administração. O script nunca sobrescreve rascunho já editado.
 *
 * O que estes textos têm de próprio está na cláusula 3 de cada um — o que
 * aquela ferramenta NÃO faz. Essa parte veio do que o sistema declara sobre si
 * mesmo, não de um modelo. O resto é estrutura, e os pontos que dependem de
 * decisão do advogado estão marcados com [DECIDIR:].
 *
 * Uso:
 *   npm run contratos:rascunho AGROJUD
 *   npm run contratos:rascunho -- --todas
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMPRESA = {
  razaoSocial: "BLACKBIRD SOLUÇÕES ESTRATÉGICAS LTDA",
  cnpj: "30.044.017/0001-01",
  endereco: "Rua Rui Barbosa, 1.249, Jardim Progresso, Guariba/SP, CEP 14842-042",
};

function abertura(objeto) {
  return `## 1. Partes e objeto

De um lado, ${EMPRESA.razaoSocial}, inscrita no CNPJ sob o nº ${EMPRESA.cnpj}, com sede na ${EMPRESA.endereco}, doravante BLACKBIRD; de outro, a pessoa física ou jurídica identificada no cadastro desta solução, doravante CONTRATANTE.

${objeto}`;
}

/**
 * Cláusula sobre consulta a dados de terceiros.
 *
 * Vale só para as soluções em que o CONTRATANTE pesquisa OUTRA pessoa. É a
 * cláusula que mais protege a BLACKBIRD nessas soluções: quem escolhe consultar
 * e para quê é o contratante, e a base legal do tratamento é dele.
 */
const DADOS_DE_TERCEIROS = `Nesta solução o CONTRATANTE consulta informações sobre pessoas e empresas que não são ele. Quem decide consultar, sobre quem e para qual finalidade é o CONTRATANTE.

O CONTRATANTE declara que possui base legal para o tratamento desses dados (Lei nº 13.709/2018, arts. 7º e 11), responde pela finalidade da consulta e se obriga a não usar o resultado para fim discriminatório, vexatório ou ilícito.

A BLACKBIRD apenas executa a consulta às fontes e organiza o resultado. Não avalia o mérito do motivo da consulta e não responde pelo uso que o CONTRATANTE fizer da informação.

Toda consulta fica registrada, com autor, data e alvo — inclusive para que o CONTRATANTE possa demonstrar, se questionado, o que consultou e quando.`;

/**
 * Corpo comum a todos os contratos, na estrutura padrão de um contrato de
 * SaaS: definições, licença, uso aceitável, conta, preço, prazo, garantias,
 * dados e sigilo (com os operadores REAIS que o sistema usa, nomeados — não
 * um "terceiros" genérico), disponibilidade, responsabilidade e indenização,
 * propriedade intelectual, força maior, cessão, comunicações, disposições
 * gerais, alterações e lei aplicável/foro.
 *
 * Cada solução entra só com a cláusula 1 (partes/objeto), 2 (o que entrega) e
 * 3 (o que não faz) — que são as que de fato mudam de uma para outra. Daqui
 * para baixo é a mesma base jurídica para todas, com o nome da solução
 * interpolado onde precisa.
 */
/**
 * Lista de operadores REAL de cada solução — conferida no código, não
 * suposta. Cada linha só entra na cláusula de dados da solução que
 * efetivamente usa aquele operador:
 *
 * - Anthropic (leitura por IA): Agrojud, Gestão de ativos, Verificação.
 *   Não usado por Compliance, Licitações, Due diligence, Consulta cadastral.
 * - Infosimples (mandado/improbidade, emissão de certidão): Gestão de ativos,
 *   Due diligence (via motor-pessoa.ts, compartilhado), Verificação.
 *   Não usado por Compliance/Licitações (motor-empresa.ts não o chama) nem
 *   por Agrojud/Consulta cadastral.
 * - SERASA (bureau direto): só a própria solução de Consulta cadastral.
 */
function listaDeOperadores({ usaIA = false, usaInfosimples = false, usaSerasa = false }) {
  const linhas = [
    "Railway, para hospedagem da aplicação e do banco de dados",
    "Asaas Gestão Financeira S.A., para processamento de pagamento",
    "Resend, para envio de e-mail transacional",
  ];
  if (usaInfosimples) linhas.push("Infosimples, para consulta a mandado de prisão, improbidade administrativa e emissão de certidão junto ao órgão emissor, quando aplicável");
  if (usaSerasa) linhas.push("Serasa Experian, provedora do bureau de dados consultado");
  if (usaIA) linhas.push("Anthropic, para leitura assistida por inteligência artificial dos documentos que o CONTRATANTE envia — o conteúdo enviado é processado por esse operador e não é usado para treinar modelo de terceiro");

  const ultima = linhas.pop();
  return linhas.length > 0 ? `${linhas.join("; ")}; e ${ultima}` : ultima;
}

/**
 * Monta o corpo comum em DUAS passadas, para as referências cruzadas entre
 * cláusulas ("na forma da cláusula X") apontarem para o número certo mesmo
 * quando a cláusula de dados de terceiros desloca a numeração — o que
 * acontece em 4 das 7 soluções. Referência cruzada escrita como número fixo
 * foi tentada primeiro e ficava errada nessas 4; por isso a chave simbólica.
 *
 * 1ª passada: monta a lista de cláusulas (só as que entram, conforme as
 * flags) e atribui o número de cada uma pela posição.
 * 2ª passada: gera o texto de cada corpo, já podendo citar `numero.CHAVE`
 * de qualquer outra cláusula da lista — inclusive uma que vem depois dela.
 */
function corpoComum({ nome, comDadosDeTerceiros = false, usaIA = false, usaInfosimples = false, usaSerasa = false }) {
  const definicoes = [
    { chave: "DEFINICOES", titulo: "Definições" },
    { chave: "LICENCA", titulo: "Licença de uso" },
    { chave: "USO_ACEITAVEL", titulo: "Uso aceitável" },
    ...(comDadosDeTerceiros ? [{ chave: "TERCEIROS", titulo: "Consulta a dados de terceiros" }] : []),
    { chave: "CONTA", titulo: "Conta, acesso e uso" },
    { chave: "PRECO", titulo: "Preço, cobrança, reajuste e inadimplência" },
    { chave: "PRAZO", titulo: "Prazo, cancelamento e efeitos" },
    { chave: "GARANTIAS", titulo: "Garantias e isenção de garantias" },
    { chave: "DADOS", titulo: "Dados pessoais, sigilo e operadores" },
    { chave: "DISPONIBILIDADE", titulo: "Disponibilidade e suporte" },
    { chave: "RESPONSABILIDADE", titulo: "Responsabilidade e indenização" },
    { chave: "PROPRIEDADE", titulo: "Propriedade intelectual" },
    { chave: "FORCA_MAIOR", titulo: "Força maior" },
    { chave: "CESSAO", titulo: "Cessão" },
    { chave: "COMUNICACOES", titulo: "Comunicações" },
    { chave: "GERAIS", titulo: "Disposições gerais" },
    { chave: "ALTERACOES", titulo: "Alterações deste contrato" },
    { chave: "FORO", titulo: "Lei aplicável e foro" },
  ];

  // Cláusulas 1-3 (partes/objeto, entrega, o que não faz) já foram escritas
  // fora desta função — a numeração daqui continua a partir da 4.
  const numero = {};
  definicoes.forEach((d, i) => (numero[d.chave] = i + 4));

  const CORPOS = {
    DEFINICOES: `Para este contrato: "BLACKBIRD" é a prestadora identificada no preâmbulo; "CONTRATANTE" é a pessoa física ou jurídica identificada no cadastro; "Serviço" é o acesso à solução ${nome}; "Conta" é o cadastro do CONTRATANTE na solução; "Plano" é o conjunto de recursos e o preço contratados, conforme a página de planos vigente na contratação; "Dados do Cliente" são as informações e os documentos que o CONTRATANTE insere no Serviço.`,

    LICENCA: `A BLACKBIRD concede ao CONTRATANTE licença limitada, não exclusiva, intransferível e revogável para usar o Serviço durante a vigência da Conta, para as finalidades descritas na cláusula 2, nos termos da Lei nº 9.609/1998 (Lei do Software). Esta licença não inclui o código-fonte, e nenhuma outra forma de uso é autorizada além do acesso ao Serviço pela interface disponibilizada.`,

    USO_ACEITAVEL: `O CONTRATANTE não pode: fazer engenharia reversa, descompilar ou tentar extrair o código-fonte do Serviço; revender, sublicenciar ou ceder o acesso a terceiros; compartilhar credenciais entre pessoas ou contas; usar o Serviço para fim ilícito, discriminatório ou que viole direito de terceiro; tentar burlar limite técnico, de uso ou de segurança; ou extrair dados do Serviço em volume ou frequência incompatível com o uso individual normal (raspagem automatizada). O descumprimento autoriza a suspensão do acesso, na forma da cláusula ${numero.PRECO}.`,

    TERCEIROS: DADOS_DE_TERCEIROS,

    CONTA: `O acesso é pessoal e a senha é intransferível. O CONTRATANTE responde pelo uso feito com suas credenciais e deve comunicar imediatamente qualquer suspeita de acesso indevido.

Esta Conta é exclusiva da solução ${nome}. Outras soluções da BLACKBIRD, se contratadas, têm cadastro, preço e contrato próprios, sem qualquer vínculo com este.`,

    PRECO: `O valor e a periodicidade são os informados na página de planos no momento da contratação, e ficam registrados no aceite.

A cobrança é processada pela Asaas Gestão Financeira S.A., instituição de pagamento contratada pela BLACKBIRD. A primeira cobrança ocorre ao fim do período de teste, quando houver.

[DECIDIR: regra de reajuste — sugestão: anual, pelo IPCA ou índice que o substitua, com aviso prévio de 30 dias. Alteração de preço não atinge assinatura em curso.]

O não pagamento na data de vencimento sujeita a Conta à suspensão do acesso após [DECIDIR: prazo de tolerância — sugestão: 5 dias] de atraso, mediante aviso prévio. Os Dados do Cliente são preservados durante a suspensão e pelo prazo da cláusula ${numero.DADOS}, mesmo com o acesso bloqueado.`,

    PRAZO: `A contratação vigora por prazo indeterminado e pode ser cancelada a qualquer tempo pelo CONTRATANTE, pela própria plataforma, sem multa.

O cancelamento produz efeito ao fim do período já pago, e não gera devolução proporcional, salvo nas hipóteses legais.

A BLACKBIRD pode encerrar a prestação em caso de descumprimento deste contrato ou de uso que viole a lei, mediante aviso e com prazo para regularização, exceto quando a gravidade exigir suspensão imediata.`,

    GARANTIAS: `A BLACKBIRD garante que o Serviço será prestado com a diligência normal da atividade e conforme descrito na cláusula 2.

Fora essa garantia, o Serviço é fornecido "no estado em que se encontra" ("as is"). A BLACKBIRD não garante que o Serviço atenderá a necessidade específica não descrita na cláusula 2, nem que resultado produzido por fonte externa consultada estará sempre correto ou atualizado — a responsabilidade por essas fontes é delas, conforme identificado em cada consulta.`,

    DADOS: `Os Dados do Cliente são tratados exclusivamente para executar o Serviço, nos termos da Lei nº 13.709/2018 (LGPD). A BLACKBIRD atua como operadora quanto aos Dados do Cliente, e como controladora quanto aos dados cadastrais da própria Conta.

Cada parte se obriga a manter sigilo sobre informação confidencial da outra de que tenha conhecimento em razão deste contrato, e a usá-la apenas para a execução dele. Esta obrigação sobrevive ao término do contrato pelo prazo de 2 (dois) anos.

Os Dados do Cliente não são vendidos. Para executar o Serviço, a BLACKBIRD utiliza os seguintes operadores: ${listaDeOperadores({ usaIA, usaInfosimples, usaSerasa })}.

${
  usaIA || usaSerasa
    ? "Railway" +
      (usaIA ? " e Anthropic" : "") +
      (usaSerasa ? ", e eventualmente o bureau consultado," : "") +
      " processam dados em servidores que podem estar localizados fora do Brasil. Essa transferência internacional observa as garantias do art. 33 da LGPD, e a BLACKBIRD permanece responsável pelo tratamento perante o CONTRATANTE."
    : "Railway processa dados em servidores que podem estar localizados fora do Brasil. Essa transferência internacional observa as garantias do art. 33 da LGPD, e a BLACKBIRD permanece responsável pelo tratamento perante o CONTRATANTE."
}

Registros de acesso são mantidos pelo prazo do art. 15 da Lei nº 12.965/2014 (Marco Civil da Internet).

Encerrado o contrato, o CONTRATANTE pode solicitar a exportação dos seus dados. [DECIDIR: prazo de guarda após o encerramento — sugestão: 90 dias para exportação, depois eliminação, ressalvado o que a lei obrigue a manter.]`,

    DISPONIBILIDADE: `A BLACKBIRD empenha-se em manter o Serviço disponível, mas não garante funcionamento ininterrupto nem firma, neste contrato, compromisso formal de nível de serviço (SLA). Manutenções programadas serão avisadas com antecedência sempre que possível.

Indisponibilidade de fonte externa consultada pelo Serviço não é falha da BLACKBIRD, e o sistema informa quando isso ocorre em vez de devolver resultado incompleto sem aviso.

O suporte é prestado pelos canais indicados na plataforma, em dias úteis. [DECIDIR: se a BLACKBIRD quiser se comprometer com prazo de resposta, informe aqui — por exemplo, "resposta em até 2 dias úteis".]`,

    RESPONSABILIDADE: `A BLACKBIRD responde pelos danos diretos comprovadamente causados por falha do Serviço.

[DECIDIR: limitação de responsabilidade. Sugestão comum em SaaS: limite ao valor pago nos 12 meses anteriores ao evento, excluídos lucros cessantes e danos indiretos. ATENÇÃO: se a relação for de consumo, cláusula que exonere ou atenue responsabilidade é nula (CDC, art. 51, I) — e parte dos assinantes pode ser profissional autônomo. Convém decidir se o contrato assume relação empresarial, de consumo, ou traz redação que funcione nos dois casos.]

A BLACKBIRD não responde por decisão tomada pelo CONTRATANTE com base no material produzido pelo Serviço, cuja conferência é obrigação dele, conforme a cláusula 3.

O CONTRATANTE se obriga a indenizar a BLACKBIRD por perdas decorrentes de uso do Serviço em violação a este contrato ou à lei, inclusive por reclamação de terceiro motivada por dado que o próprio CONTRATANTE inseriu ou por consulta que ele decidiu fazer.`,

    PROPRIEDADE: `O software, a marca e a estrutura da plataforma pertencem à BLACKBIRD. O conteúdo enviado pelo CONTRATANTE continua sendo dele, e o material produzido a partir dele é dele.`,

    FORCA_MAIOR: `Nenhuma das partes responde por atraso ou falha decorrente de evento alheio à sua vontade e que não poderia razoavelmente evitar, incluindo falha de infraestrutura de internet, de energia elétrica, de fornecedor de hospedagem ou de pagamento, determinação governamental, e caso fortuito ou força maior (Código Civil, art. 393).`,

    CESSAO: `Nenhuma das partes pode ceder este contrato a terceiro sem o consentimento da outra, exceto a BLACKBIRD em caso de reorganização societária, fusão, cisão ou incorporação, mediante aviso prévio ao CONTRATANTE.`,

    COMUNICACOES: `As comunicações entre as partes são válidas quando feitas para o e-mail cadastrado na Conta ou pelos canais indicados na plataforma. Cabe ao CONTRATANTE manter seu e-mail de cadastro atualizado.`,

    GERAIS: `Este contrato, junto com a página de planos vigente e a política de privacidade da plataforma, constitui o acordo integral entre as partes sobre o Serviço, substituindo entendimentos anteriores sobre o mesmo objeto.

A tolerância de uma parte quanto ao descumprimento da outra não implica renúncia ao direito de exigi-lo depois.

Se alguma cláusula deste contrato for considerada inválida, as demais permanecem em vigor.

Nenhuma disposição deste contrato cria entre as partes relação de sociedade, mandato, emprego ou representação — cada uma responde por seus próprios atos e obrigações.

As cláusulas sobre propriedade intelectual (cláusula ${numero.PROPRIEDADE}), sigilo (cláusula ${numero.DADOS}) e responsabilidade (cláusula ${numero.RESPONSABILIDADE}) sobrevivem ao término deste contrato.`,

    ALTERACOES: `Alterações valem para o futuro e são publicadas como nova versão, identificada por número e impressão digital do texto. O CONTRATANTE é avisado e, se não concordar, pode cancelar sem ônus antes do início da vigência.

Este contrato não é alterado por acordo verbal.`,

    FORO: `Este contrato é regido pela lei brasileira.

[DECIDIR: foro. Sugestão: comarca de Guariba/SP, sede da BLACKBIRD, ressalvado o direito do consumidor de demandar no foro do seu domicílio (CDC, art. 101, I), quando a relação for de consumo.]`,
  };

  return definicoes.map((d) => `## ${numero[d.chave]}. ${d.titulo}\n\n${CORPOS[d.chave]}`).join("\n\n");
}

const CONTRATOS = {
  AGROJUD: {
    titulo: "Contrato de prestação de serviço — Agrojud",
    conteudo: `${abertura(
      "O objeto é o acesso ao Agrojud, ferramenta de apoio à análise de contratos de crédito rural, na modalidade software como serviço, pelo prazo e nas condições contratadas."
    )}

## 2. O que a ferramenta entrega

A partir dos dados que o CONTRATANTE informa sobre um contrato de crédito rural, o Agrojud produz: análise de enquadramento como crédito rural, com indicação do dispositivo legal aplicado; checklist de enquadramento na linha de composição de dívidas da Medida Provisória nº 1.376/2026, requisito por requisito, com o artigo citado em cada item; análise das taxas, garantias, avalistas, riscos e seguro rural declarados; orientação sobre o alongamento da dívida rural, com os alertas de risco de cada situação; e minutas de requerimento administrativo e de petição inicial, para revisão do advogado.

## 3. O que a ferramenta NÃO faz

Esta cláusula é essencial e o CONTRATANTE declara tê-la lido.

A BLACKBIRD não é escritório de advocacia, não presta consultoria jurídica e não pratica atos privativos de advogado (Lei nº 8.906/1994). O Agrojud é ferramenta de trabalho de quem é habilitado.

As peças produzidas são MINUTAS. Saem com marcadores nos campos não preenchidos e com advertências ao advogado nos pontos que exigem decisão profissional. Nenhuma delas está pronta para protocolo sem revisão, complementação de provas e assinatura de advogado habilitado.

O enquadramento legal é decidido por regras fixas escritas a partir do texto da lei, e cada conclusão vem com o artigo que a sustenta, para conferência. A inteligência artificial, quando usada, serve apenas para propor um rascunho de leitura do PDF, que o CONTRATANTE confere e confirma antes de virar dado da análise — ela não decide enquadramento.

A BLACKBIRD não garante resultado administrativo ou judicial, não representa o CONTRATANTE perante instituição financeira ou juízo, e não responde pelo êxito da tese.

A Medida Provisória nº 1.376/2026 tem prazo de vigência e pode ser convertida em lei com texto alterado, prorrogada ou perder eficácia. O sistema acompanha essa situação em fonte oficial e a exibe, mas cabe ao CONTRATANTE conferir a norma vigente na data de uso.

${corpoComum({ nome: "Agrojud", usaIA: true })}`,
  },

  COMPLIANCE_EMPRESA: {
    titulo: "Contrato de prestação de serviço — Compliance de empresas",
    conteudo: `${abertura(
      "O objeto é o acesso à solução de Compliance de empresas, ferramenta de verificação de empresas em fontes públicas, na modalidade software como serviço."
    )}

## 2. O que a ferramenta entrega

A partir do CNPJ informado, a ferramenta reúne e organiza: situação cadastral, data de abertura, capital social, atividade e quadro societário; dívida ativa da União, com valor e natureza do débito; débitos trabalhistas reconhecidos em juízo (CNDT); protestos em cartório; presença em cadastros de empresas punidas e em listas internacionais de sanções; processos judiciais em que a empresa figura, com análise de cada um; e certidões federal, estadual e trabalhista.

As fontes consultadas são identificadas em cada item, com a data da consulta.

## 3. O que a ferramenta NÃO faz

Esta cláusula é essencial e o CONTRATANTE declara tê-la lido.

O resultado mostra o que as fontes públicas registravam NA DATA DA CONSULTA. Não é atestado de idoneidade, não prevê comportamento futuro e não substitui auditoria contábil, due diligence jurídica completa nem parecer profissional.

A BLACKBIRD não responde pelo conteúdo, pela exatidão ou pela desatualização das bases públicas consultadas — ela reproduz o que a fonte respondeu, identificando qual foi e quando.

Ausência de apontamento não significa inexistência de risco: significa que aquelas fontes, naquele momento, não registravam apontamento.

A BLACKBIRD não é escritório de advocacia e não presta consultoria jurídica (Lei nº 8.906/1994). A decisão de contratar, fornecer, comprar ou investir é do CONTRATANTE.

${corpoComum({ nome: "Compliance de empresas", comDadosDeTerceiros: true })}`,
  },

  DILIGENCIA_PESSOA: {
    titulo: "Contrato de prestação de serviço — Due diligence de pessoas",
    conteudo: `${abertura(
      "O objeto é o acesso à solução de Due diligence de pessoas, ferramenta de verificação de pessoas físicas em fontes públicas e, quando contratadas, em bases de bureau de crédito, na modalidade software como serviço."
    )}

## 2. O que a ferramenta entrega

A partir dos dados informados sobre a pessoa consultada, a ferramenta reúne: sanções internacionais e dívida ativa da União; consulta ao banco nacional de mandados de prisão; consulta ao cadastro de condenações por improbidade administrativa; dados de bureau de crédito, quando essa fonte estiver contratada; e parecer final consolidado, com histórico consultável.

## 3. O que a ferramenta NÃO faz

Esta cláusula é essencial e o CONTRATANTE declara tê-la lido.

PROCESSO EM CURSO NÃO É CONDENAÇÃO. O parecer distingue expressamente as duas coisas, em observância ao art. 5º, LVII, da Constituição e à Súmula 444 do Superior Tribunal de Justiça. Tratar apontamento de processo como culpa é uso indevido do resultado, e a responsabilidade por esse uso é do CONTRATANTE.

Consultas a mandado de prisão e a condenações por improbidade exigem nome da mãe e data de nascimento. Sem esses dados a consulta é recusada com aviso, e não devolve resultado parcial — resultado parcial nessas bases produz homônimo, e homônimo produz dano.

O resultado retrata o que as fontes registravam na data da consulta. Não é atestado de idoneidade nem previsão de comportamento futuro.

A BLACKBIRD não é escritório de advocacia e não presta consultoria jurídica (Lei nº 8.906/1994).

${corpoComum({ nome: "Due diligence de pessoas", comDadosDeTerceiros: true, usaInfosimples: true })}`,
  },

  VERIFICACAO_DOCUMENTOS: {
    titulo: "Contrato de prestação de serviço — Verificação de documentos",
    conteudo: `${abertura(
      "O objeto é o acesso à solução de Verificação de documentos, ferramenta de controle, conferência e acompanhamento de validade de documentos e certidões, na modalidade software como serviço."
    )}

## 2. O que a ferramenta entrega

Impressão digital (hash) de cada arquivo enviado, que permite demonstrar depois que ele não foi alterado; controle de validade, com aviso antes do vencimento; leitura assistida por inteligência artificial para extrair tipo de documento, dados principais e validade; reemissão da mesma certidão junto ao órgão, quando o órgão permite e a integração estiver contratada; comparação entre o documento apresentado e o que o órgão responde no momento da conferência; e histórico dos documentos verificados.

## 3. O que a ferramenta NÃO faz

Esta cláusula é essencial e o CONTRATANTE declara tê-la lido.

A impressão digital prova que o arquivo não mudou DESDE O ENVIO. Ela não prova que o documento original é autêntico, nem que foi emitido por quem afirma tê-lo emitido.

A conferência de autenticidade depende de o órgão emissor oferecer verificação e de essa integração estar ativa. Quando não houver, o documento permanece registrado e com validade controlada, mas sem confronto automático — e o sistema informa isso, em vez de sugerir uma verificação que não ocorreu.

A leitura por inteligência artificial é auxiliar: extrai um rascunho dos dados, que o CONTRATANTE confere. Ela não atesta autenticidade nem substitui a leitura do documento.

A reemissão automática cobre apenas as certidões e os órgãos listados no catálogo vigente, e depende de contrato de integração em vigor.

${corpoComum({ nome: "Verificação de documentos", usaIA: true, usaInfosimples: true })}`,
  },

  LICITACOES: {
    titulo: "Contrato de prestação de serviço — Análise de licitações",
    conteudo: `${abertura(
      "O objeto é o acesso à solução de Análise de licitações, ferramenta de organização e conferência de documentação de habilitação, na modalidade software como serviço, para participantes de certames e para entes públicos."
    )}

## 2. O que a ferramenta entrega

Para quem participa: geração, a partir do cadastro, das declarações padronizadas de habilitação — credenciamento, inexistência de fato superveniente, não emprego de menor, pleno atendimento e enquadramento como ME/EPP —, reaproveitáveis em certames diferentes.

Para o ente público: conferência de cada participante contra as fontes públicas de regularidade, com o resultado organizado por participante.

## 3. O que a ferramenta NÃO faz

Esta cláusula é essencial e o CONTRATANTE declara tê-la lido.

As declarações são MINUTAS geradas a partir dos dados que o próprio CONTRATANTE cadastrou. Quem assina responde pelo conteúdo declarado, inclusive penalmente e perante a Administração. Cabe ao CONTRATANTE conferir cada declaração antes de assinar e verificar se ela atende às exigências do edital concreto.

A BLACKBIRD não garante habilitação, não recorre, não representa o CONTRATANTE perante a Administração e não responde por inabilitação, desclassificação ou sanção.

A conferência de regularidade reflete o que as fontes públicas registravam na data da consulta, e não substitui a análise do edital nem a decisão da comissão ou do pregoeiro.

A BLACKBIRD não é escritório de advocacia e não presta consultoria jurídica (Lei nº 8.906/1994).

[DECIDIR: a leitura automática do edital e o cruzamento em lote de participantes ainda estão em construção. Convém dizer no contrato o que já está disponível, para não prometer o que ainda não entrega.]

${corpoComum({ nome: "Análise de licitações", comDadosDeTerceiros: true })}`,
  },

  GESTAO_ATIVOS: {
    titulo: "Contrato de prestação de serviço — Gestão de ativos e operações",
    conteudo: `${abertura(
      "O objeto é o acesso à solução de Gestão de ativos e operações, ferramenta de cadastro de operações, geração de documentos e controle de documentação, na modalidade software como serviço."
    )}

## 2. O que a ferramenta entrega

Documentos gerados a partir do cadastro e adaptados ao tipo de ativo; nomeação e proteção da cadeia de intermediação em acordo de não circunvenção; calculadora de atualização de precatório com índices de fonte oficial; controle das certidões exigidas por ativo, com prazo de validade; e registro de quem fez o quê, com impressão digital em cada documento gerado.

## 3. O que a ferramenta NÃO faz

Esta cláusula é essencial e o CONTRATANTE declara tê-la lido.

Os documentos gerados são MINUTAS, feitas para revisão por advogado antes da assinatura. A BLACKBIRD não é escritório de advocacia e não presta consultoria jurídica (Lei nº 8.906/1994).

A calculadora aplica índices obtidos em fonte oficial à data da consulta, para conferência e planejamento. O resultado não é cálculo oficial, não vincula juízo, contadoria judicial ou ente devedor, e não substitui memória de cálculo elaborada por profissional habilitado.

A BLACKBIRD não intermedeia a compra, a venda ou a cessão de ativos, não avalia a liquidez, o risco ou o preço de nenhuma operação, e não presta consultoria financeira ou de investimento.

A decisão de contratar, ceder, adquirir ou pagar é exclusivamente do CONTRATANTE.

${corpoComum({ nome: "Gestão de ativos e operações", usaIA: true, usaInfosimples: true })}`,
  },

  CONSULTA_CADASTRAL_SERASA: {
    titulo: "Contrato de prestação de serviço — Consulta cadastral",
    conteudo: `${abertura(
      "O objeto é o acesso à solução de Consulta cadastral, que devolve situação cadastral, score e restrições de pessoa física ou jurídica, na modalidade software como serviço, com pagamento por saldo pré-pago."
    )}

[DECIDIR — ANTES DE PUBLICAR: esta solução ainda não está operacional; falta a integração com o bureau. Cadastro, login e saldo pré-pago funcionam, mas a consulta não responde. Publicar contrato e vender saldo antes de a consulta funcionar cria obrigação que hoje não há como cumprir. Sugestão: manter este rascunho sem publicar até a integração entrar no ar, ou publicar com cláusula expressa de indisponibilidade e sem venda de saldo.]

## 2. O que a ferramenta entrega

Consulta à base do bureau contratado, devolvendo situação cadastral, score e restrições registradas — negativação, protesto e ações judiciais —, com histórico consultável.

O serviço é cobrado por consulta, mediante saldo pré-pago. Cada consulta debita o saldo no momento em que é executada.

## 3. O que a ferramenta NÃO faz

Esta cláusula é essencial e o CONTRATANTE declara tê-la lido.

O resultado reproduz o que o bureau registrava na data da consulta. A BLACKBIRD não produz, não corrige e não contesta a informação: quem responde por ela é o bureau, e a contestação segue o procedimento próprio dele.

Score não é decisão de crédito nem recomendação. É indicador estatístico produzido por terceiro.

O resultado não é atestado de idoneidade nem previsão de comportamento futuro, e ausência de restrição não significa ausência de risco.

A BLACKBIRD não é escritório de advocacia e não presta consultoria jurídica (Lei nº 8.906/1994).

${corpoComum({ nome: "Consulta cadastral", comDadosDeTerceiros: true, usaSerasa: true })}`,
  },
};

async function criarRascunho(chave, { substituir }) {
  const modelo = CONTRATOS[chave];
  if (!modelo) {
    console.log(`  ${chave}: sem rascunho pronto`);
    return;
  }

  const rascunho = await prisma.contratoSolucao.findFirst({ where: { solucao: chave, publicado: false } });
  const decidir = (modelo.conteudo.match(/\[DECIDIR/g) || []).length;

  if (rascunho) {
    if (!substituir) {
      console.log(`  ${chave}: já existe rascunho (versão ${rascunho.versao}) — nada alterado (use --substituir para atualizar o texto)`);
      return;
    }
    // Atualiza o rascunho no lugar, mesma versão: como nada foi publicado
    // ainda, não existe aceite vinculado a ele, então não há prova a preservar.
    await prisma.contratoSolucao.update({
      where: { id: rascunho.id },
      data: { titulo: modelo.titulo, conteudo: modelo.conteudo.trim() },
    });
    console.log(`  ${chave}: rascunho da versão ${rascunho.versao} SUBSTITUÍDO · ${decidir} ponto(s) marcado(s) com [DECIDIR:]`);
    return;
  }

  const ultima = await prisma.contratoSolucao.findFirst({ where: { solucao: chave }, orderBy: { versao: "desc" } });
  const versao = (ultima?.versao ?? 0) + 1;

  await prisma.contratoSolucao.create({
    data: { solucao: chave, versao, titulo: modelo.titulo, conteudo: modelo.conteudo.trim(), criadoPor: "rascunho-contratos" },
  });

  console.log(`  ${chave}: rascunho da versão ${versao} criado · ${decidir} ponto(s) marcado(s) com [DECIDIR:]`);
}

async function principal() {
  const argumentos = process.argv.slice(2);
  const todas = argumentos.includes("--todas");
  const substituir = argumentos.includes("--substituir");
  const alvos = todas
    ? Object.keys(CONTRATOS)
    : argumentos.map((a) => a.toUpperCase()).filter((a) => a !== "--TODAS" && a !== "--SUBSTITUIR");

  if (alvos.length === 0) {
    console.error(`\nInforme a solução, ou use --todas.\nDisponíveis: ${Object.keys(CONTRATOS).join(", ")}\n`);
    process.exitCode = 1;
    return;
  }

  console.log("\n=== Rascunhos de contrato ===\n");
  for (const chave of alvos) await criarRascunho(chave, { substituir });

  console.log("\nNENHUM está publicado: ninguém aceita nada até você revisar e publicar.");
  console.log("Revise em /admin/painel/contratos — procure os trechos marcados com [DECIDIR:].\n");
}

principal()
  .catch((erro) => {
    console.error("\nFalhou:", erro.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
