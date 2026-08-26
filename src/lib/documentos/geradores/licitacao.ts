/**
 * Declarações padronizadas de habilitação em licitação pública.
 *
 * São os anexos que se repetem, com redação quase idêntica, em praticamente
 * todo edital brasileiro — termo de credenciamento, inexistência de fato
 * impeditivo, não emprego de menor, pleno atendimento aos requisitos, ME/EPP.
 * A empresa preenche o próprio cadastro uma vez, e cada declaração sai pronta
 * para qualquer certame — só o número do processo, a modalidade e o órgão
 * licitante mudam a cada edital.
 *
 * A redação foi conferida contra um edital real (Pregão Presencial nº
 * 004/2021, Prefeitura de Icém/SP), não inventada: cada declaração aqui tem
 * o mesmo conteúdo jurídico do anexo correspondente daquele edital, só que
 * escrita para ser gerada a partir do cadastro, não digitada à mão.
 */
import { paragrafo, paragrafoRico } from "../base";
import { qualificar, identificacao, nomeCurto } from "../qualificacao";
import { campo, type ContextoDocumento } from "../contexto";
import type { MontagemDocumento } from "../montagem";

/** Dados do certame que toda declaração de licitação carrega no preâmbulo. */
function dadosDoCertame(ctx: ContextoDocumento) {
  return {
    orgao: campo(ctx, "orgaoLicitante", "[ÓRGÃO LICITANTE NÃO INFORMADO]"),
    modalidade: campo(ctx, "modalidade", "[MODALIDADE NÃO INFORMADA]"),
    numero: campo(ctx, "numeroCertame", "[NÚMERO DO CERTAME NÃO INFORMADO]"),
  };
}

function licitanteOuAviso(ctx: ContextoDocumento): string {
  if (!ctx.licitante) {
    return "[EMPRESA LICITANTE NÃO INFORMADA — selecione a empresa antes de gerar]";
  }
  return qualificar(ctx.licitante);
}

function assinanteDoLicitante(ctx: ContextoDocumento) {
  if (!ctx.licitante) return [];
  return [
    {
      nome: ctx.licitante.repNome || nomeCurto(ctx.licitante),
      papel: ctx.licitante.repCargo || "Representante legal",
      identificacao: identificacao(ctx.licitante),
    },
  ];
}

// =====================================================================
// Termo de credenciamento
// =====================================================================

export function gerarLicitCredenciamento(ctx: ContextoDocumento): MontagemDocumento {
  const { orgao, modalidade, numero } = dadosDoCertame(ctx);
  const nomeRepresentante = campo(ctx, "nomeCredenciado") || ctx.licitante?.repNome || "[NOME DO CREDENCIADO]";
  const rgRepresentante = campo(ctx, "rgCredenciado") || ctx.licitante?.repRg || "[RG DO CREDENCIADO]";
  const cpfRepresentante = campo(ctx, "cpfCredenciado") || ctx.licitante?.repCpf || "[CPF DO CREDENCIADO]";

  const corpo = [
    paragrafo(
      `Através do presente, credenciamos o(a) Sr.(a) ${nomeRepresentante}, portador(a) do RG nº ${rgRepresentante} ` +
        `e do CPF nº ${cpfRepresentante}, a participar da licitação instaurada por ${orgao}, na modalidade ` +
        `${modalidade} nº ${numero}, na qualidade de representante legal, outorgando-lhe poderes para ` +
        "pronunciar-se em nome da empresa, bem como formular propostas, ofertar lances verbais, renunciar " +
        "direitos, renunciar ou desistir de recursos e praticar todos os demais atos inerentes ao certame."
    ),
  ];

  return {
    titulo: "Termo de Credenciamento",
    corpo,
    assinantes: assinanteDoLicitante(ctx),
    comTestemunhas: false,
    semLocalEData: false,
  };
}

// =====================================================================
// Inexistência de fato superveniente impeditivo da habilitação
// =====================================================================

export function gerarLicitFatoSuperveniente(ctx: ContextoDocumento): MontagemDocumento {
  const corpo = [
    paragrafoRico(`${licitanteOuAviso(ctx)}, doravante denominada **DECLARANTE**.`),
    paragrafo(
      "A DECLARANTE declara, sob as penas da lei, que até a presente data inexiste fato superveniente " +
        "impeditivo de sua habilitação no presente processo licitatório, ciente da obrigatoriedade de declarar " +
        "ocorrências posteriores."
    ),
  ];

  return {
    titulo: "Declaração de Inexistência de Fato Superveniente Impeditivo à Habilitação",
    corpo,
    assinantes: assinanteDoLicitante(ctx),
    comTestemunhas: false,
  };
}

// =====================================================================
// Não emprega menor — art. 7º, XXXIII, CF
// =====================================================================

export function gerarLicitNaoEmpregaMenor(ctx: ContextoDocumento): MontagemDocumento {
  const corpo = [
    paragrafoRico(`${licitanteOuAviso(ctx)}, doravante denominada **DECLARANTE**.`),
    paragrafo(
      "A DECLARANTE, por intermédio de seu representante legal, declara, para os fins do disposto no inciso " +
        "XXXIII do art. 7º da Constituição Federal e no inciso V do art. 27 da Lei nº 8.666, de 21 de junho de " +
        "1993, acrescido pela Lei nº 9.854, de 27 de outubro de 1999, que não emprega menor de dezoito anos em " +
        "trabalho noturno, perigoso ou insalubre, e não emprega menor de dezesseis anos em qualquer trabalho, " +
        "salvo na condição de aprendiz, a partir de quatorze anos."
    ),
  ];

  return {
    titulo: "Declaração de Que Não Emprega Menores",
    corpo,
    assinantes: assinanteDoLicitante(ctx),
    comTestemunhas: false,
  };
}

// =====================================================================
// Pleno atendimento aos requisitos de habilitação
// =====================================================================

export function gerarLicitPlenoAtendimento(ctx: ContextoDocumento): MontagemDocumento {
  const { orgao, modalidade, numero } = dadosDoCertame(ctx);

  const corpo = [
    paragrafoRico(`${licitanteOuAviso(ctx)}, doravante denominada **DECLARANTE**.`),
    paragrafo(
      `A DECLARANTE, por intermédio de seu representante legal, declara, para fins de participação em ${orgao}, ` +
        `na modalidade ${modalidade} nº ${numero}, que atende plenamente aos requisitos de habilitação exigidos ` +
        "no respectivo edital, nos termos do inciso VII do art. 4º da Lei nº 10.520, de 17 de julho de 2002, ou " +
        "do dispositivo equivalente da Lei nº 14.133, de 1º de abril de 2021, conforme a modalidade do certame."
    ),
  ];

  return {
    titulo: "Declaração de Pleno Atendimento aos Requisitos de Habilitação",
    corpo,
    assinantes: assinanteDoLicitante(ctx),
    comTestemunhas: false,
  };
}

// =====================================================================
// Microempresa / Empresa de Pequeno Porte
// =====================================================================

export function gerarLicitMeEpp(ctx: ContextoDocumento): MontagemDocumento {
  const corpo = [
    paragrafoRico(`${licitanteOuAviso(ctx)}, doravante denominada **DECLARANTE**.`),
    paragrafo(
      "A DECLARANTE, por intermédio de seu representante legal, declara que é Microempresa ou Empresa de " +
        "Pequeno Porte, nos termos do enquadramento previsto na Lei Complementar nº 123, de 14 de dezembro de " +
        "2006, com as alterações da Lei Complementar nº 147, de 7 de agosto de 2014, cujos termos declara " +
        "conhecer na íntegra, e não possuir qualquer dos impedimentos previstos nos §§ 4º e seguintes do art. 3º " +
        "da mesma lei, estando apta, portanto, a exercer o direito de preferência como critério de desempate e " +
        "o benefício da regularização fiscal tardia no procedimento licitatório."
    ),
    paragrafo("Por ser verdade, firma a presente sob as penas da lei.", { espacoDepois: 240 }),
  ];

  return {
    titulo: "Declaração de Microempresa ou Empresa de Pequeno Porte",
    corpo,
    assinantes: assinanteDoLicitante(ctx),
    comTestemunhas: false,
  };
}
