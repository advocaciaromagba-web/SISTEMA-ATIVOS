/**
 * Carrega um RASCUNHO de contrato para uma solução.
 *
 * Rascunho, não publicado: nada passa a valer sem alguém revisar e publicar
 * pela tela de administração. O texto abaixo descreve o que o sistema
 * realmente faz e o que ele não faz — essa parte veio do próprio código, não
 * de um modelo genérico. O resto é estrutura, para o advogado ajustar.
 *
 * Uso:
 *   npm run contratos:rascunho AGROJUD
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMPRESA = {
  razaoSocial: "BLACKBIRD SOLUÇÕES ESTRATÉGICAS LTDA",
  cnpj: "30.044.017/0001-01",
  endereco: "Rua Rui Barbosa, 1.249, Jardim Progresso, Guariba/SP, CEP 14842-042",
  site: "https://www.blackbirdsolucoes.com.br",
};

/**
 * Partes comuns a todas as soluções. O que muda de uma para outra é o objeto,
 * o que a ferramenta entrega e o que ela não faz — e é justamente essa parte
 * que não pode ser genérica.
 */
function corpoComum({ nome }) {
  return `
## 4. Conta, acesso e uso

O acesso é pessoal e a senha é intransferível. O CONTRATANTE responde pelo uso feito com suas credenciais e deve comunicar imediatamente qualquer suspeita de acesso indevido.

Esta conta é exclusiva da solução ${nome}. Outras soluções da BLACKBIRD, se contratadas, têm cadastro, preço e contrato próprios, sem qualquer vínculo com este.

## 5. Preço, cobrança e reajuste

O valor e a periodicidade são os informados na página de planos no momento da contratação, e ficam registrados no aceite.

A cobrança é processada por instituição de pagamento contratada pela BLACKBIRD. A primeira cobrança ocorre ao fim do período de teste, quando houver.

[DECIDIR: regra de reajuste — sugestão: anual, pelo IPCA ou índice que o substitua, sempre com aviso prévio de 30 dias. Alteração de preço não atinge assinatura em curso.]

## 6. Prazo, cancelamento e efeitos

A contratação vigora por prazo indeterminado e pode ser cancelada a qualquer tempo pelo CONTRATANTE, pela própria plataforma, sem multa.

O cancelamento produz efeito ao fim do período já pago, e não gera devolução proporcional, salvo nas hipóteses legais.

A BLACKBIRD pode encerrar a prestação em caso de descumprimento deste contrato ou de uso que viole a lei, mediante aviso e com prazo para regularização, exceto quando a gravidade exigir suspensão imediata.

## 7. Dados e sigilo

Os documentos e informações enviados pelo CONTRATANTE são tratados exclusivamente para executar o serviço contratado, nos termos da Lei nº 13.709/2018 (LGPD).

A BLACKBIRD atua como operadora quanto aos dados que o CONTRATANTE insere, e como controladora quanto aos dados cadastrais da própria conta.

Os dados não são vendidos nem compartilhados com terceiros, ressalvados: os operadores necessários à prestação (hospedagem, pagamento e, quando aplicável, leitura assistida por inteligência artificial) e as hipóteses de obrigação legal ou ordem judicial.

Registros de acesso são mantidos pelo prazo do art. 15 da Lei nº 12.965/2014 (Marco Civil da Internet).

Encerrado o contrato, o CONTRATANTE pode solicitar a exportação dos seus dados. [DECIDIR: prazo de guarda após o encerramento — sugestão: 90 dias para exportação, depois eliminação, ressalvado o que a lei obrigue a manter.]

## 8. Disponibilidade

A BLACKBIRD empenha-se em manter o serviço disponível, mas não garante funcionamento ininterrupto. Manutenções programadas serão avisadas com antecedência sempre que possível.

Indisponibilidade de fonte externa consultada pelo serviço não é falha da BLACKBIRD, e o sistema informa quando isso ocorre em vez de devolver resultado incompleto sem aviso.

## 9. Responsabilidade

A BLACKBIRD responde pelos danos diretos comprovadamente causados por falha do serviço.

[DECIDIR: limitação de responsabilidade. Sugestão comum em SaaS: limite ao valor pago nos 12 meses anteriores ao evento. ATENÇÃO: se a relação for de consumo, cláusula que exonere ou atenue responsabilidade é nula (CDC, art. 51, I) — e parte dos assinantes pode ser profissional autônomo. Convém decidir se o contrato assume relação empresarial, de consumo, ou traz redação que funcione nos dois casos.]

A BLACKBIRD não responde por decisão tomada pelo CONTRATANTE com base no material produzido pela ferramenta, cuja revisão é obrigação dele, conforme a cláusula 3.

## 10. Propriedade intelectual

O software, a marca e a estrutura da plataforma pertencem à BLACKBIRD. O conteúdo enviado pelo CONTRATANTE continua sendo dele, e o material produzido a partir dele é dele.

## 11. Alterações deste contrato

Alterações valem para o futuro e são publicadas como nova versão, identificada por número e impressão digital do texto. O CONTRATANTE é avisado e, se não concordar, pode cancelar sem ônus antes do início da vigência.

Este contrato não é alterado por acordo verbal.

## 12. Foro

[DECIDIR: foro. Sugestão: comarca de Guariba/SP, sede da BLACKBIRD, ressalvado o direito do consumidor de demandar no foro do seu domicílio (CDC, art. 101, I), quando a relação for de consumo.]
`.trim();
}

const CONTRATOS = {
  AGROJUD: {
    titulo: "Contrato de prestação de serviço — Agrojud",
    conteudo: `
## 1. Partes e objeto

De um lado, ${EMPRESA.razaoSocial}, inscrita no CNPJ sob o nº ${EMPRESA.cnpj}, com sede na ${EMPRESA.endereco}, doravante BLACKBIRD; de outro, a pessoa física ou jurídica identificada no cadastro desta solução, doravante CONTRATANTE.

O objeto é o acesso ao Agrojud, ferramenta de apoio à análise de contratos de crédito rural, na modalidade software como serviço, pelo prazo e nas condições contratadas.

## 2. O que a ferramenta entrega

A partir dos dados que o CONTRATANTE informa sobre um contrato de crédito rural, o Agrojud produz:

análise de enquadramento como crédito rural, com indicação do dispositivo legal aplicado;

checklist de enquadramento na linha de composição de dívidas da Medida Provisória nº 1.376/2026, requisito por requisito, com o artigo citado em cada item;

análise das taxas, garantias, avalistas, riscos e seguro rural declarados;

orientação sobre o alongamento da dívida rural, com os alertas de risco de cada situação;

minutas de requerimento administrativo e de petição inicial, para revisão do advogado.

## 3. O que a ferramenta NÃO faz — e por que isso está aqui

Esta cláusula é essencial e o CONTRATANTE declara tê-la lido.

A BLACKBIRD não é escritório de advocacia, não presta consultoria jurídica e não pratica atos privativos de advogado (Lei nº 8.906/1994). O Agrojud é ferramenta de trabalho de quem é habilitado.

As peças produzidas são MINUTAS. Saem com marcadores nos campos não preenchidos e com advertências ao advogado nos pontos que exigem decisão profissional. Nenhuma delas está pronta para protocolo sem revisão, complementação de provas e assinatura de advogado habilitado.

O enquadramento legal é decidido por regras fixas escritas a partir do texto da lei, e cada conclusão vem com o artigo que a sustenta, para conferência. A inteligência artificial, quando usada, serve apenas para propor um rascunho de leitura do PDF, que o CONTRATANTE confere e confirma antes de virar dado da análise — ela não decide enquadramento.

A BLACKBIRD não garante resultado administrativo ou judicial, não representa o CONTRATANTE perante instituição financeira ou juízo, e não responde pelo êxito da tese.

A Medida Provisória nº 1.376/2026 tem prazo de vigência e pode ser convertida em lei com texto alterado, prorrogada ou perder eficácia. O sistema acompanha essa situação em fonte oficial e a exibe, mas cabe ao CONTRATANTE conferir a norma vigente na data de uso.

${corpoComum({ nome: "Agrojud" })}
`.trim(),
  },
};

async function principal() {
  const chave = (process.argv[2] ?? "").toUpperCase();
  const modelo = CONTRATOS[chave];

  if (!modelo) {
    console.error(`\nSolução sem rascunho pronto: ${chave || "(nenhuma informada)"}`);
    console.error(`Disponíveis: ${Object.keys(CONTRATOS).join(", ")}\n`);
    process.exitCode = 1;
    return;
  }

  const jaPublicado = await prisma.contratoSolucao.findFirst({ where: { solucao: chave, publicado: true } });
  const rascunho = await prisma.contratoSolucao.findFirst({ where: { solucao: chave, publicado: false } });

  if (rascunho) {
    console.log(`\nJá existe rascunho (versão ${rascunho.versao}) para ${chave}. Nada foi alterado,`);
    console.log("para não sobrescrever texto que você já editou. Edite pela tela de administração.\n");
    return;
  }

  const ultima = await prisma.contratoSolucao.findFirst({ where: { solucao: chave }, orderBy: { versao: "desc" } });
  const versao = (ultima?.versao ?? 0) + 1;

  await prisma.contratoSolucao.create({
    data: {
      solucao: chave,
      versao,
      titulo: modelo.titulo,
      conteudo: modelo.conteudo,
      criadoPor: "rascunho-contratos",
    },
  });

  console.log(`\nRascunho da versão ${versao} criado para ${chave}.`);
  console.log("NÃO está publicado: ninguém aceita nada até você revisar e publicar.");
  if (jaPublicado) console.log(`(A versão ${jaPublicado.versao}, publicada, continua em vigor até lá.)`);
  console.log("\nRevise em /admin/painel/contratos — procure os trechos marcados com [DECIDIR:].\n");
}

principal()
  .catch((erro) => {
    console.error("\nFalhou:", erro.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
