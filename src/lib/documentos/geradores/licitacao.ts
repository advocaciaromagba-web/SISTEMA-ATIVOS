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
import { paragrafoRico, ou, type BlocoAssinatura } from "../base";
import { campo, type ContextoDocumento } from "../contexto";
import type { MontagemDocumento } from "../montagem";
import { formatarCep, formatarDocumento } from "@/lib/validacao";
import type { LicitanteEmpresa } from "@prisma/client";

/**
 * O conteúdo da declaração antes de virar arquivo.
 *
 * Existe porque a mesma declaração precisa sair em dois formatos: .docx (para
 * quem vai revisar antes de assinar) e PDF (o único que aceita assinatura
 * digital ICP-Brasil, que é o que o edital exige). Mantendo o TEXTO num lugar
 * só, os dois formatos nunca divergem — o risco real seria a versão assinada
 * dizer algo diferente da versão revisada.
 *
 * Trechos entre **asteriscos** saem em negrito nos dois formatos.
 */
export type TextoDeclaracao = {
  titulo: string;
  paragrafos: string[];
  assinantes: BlocoAssinatura[];
};

/**
 * Qualificação da empresa licitante — versão própria da solução de
 * licitações, que não importa `qualificacao.ts` porque aquele módulo é
 * tipado em `Pessoa`, do cadastro de partes da gestão de ativos. As duas
 * soluções não compartilham tabela, então também não compartilham a função
 * que lê os campos dela.
 */
function qualificarLicitante(e: LicitanteEmpresa): string {
  const partes = [
    e.nome.toUpperCase(),
    "pessoa jurídica de direito privado",
    `inscrita no CNPJ/MF sob o nº ${formatarDocumento(e.documento) || "[CNPJ NÃO INFORMADO]"}`,
  ];

  if (e.inscricaoEstadual) partes.push(`inscrição estadual nº ${e.inscricaoEstadual}`);

  partes.push(
    `com sede na ${ou(e.enderecoRua, "endereço")}, nº ${ou(e.enderecoNumero, "número")}` +
      `${e.enderecoComplemento ? `, ${e.enderecoComplemento}` : ""}, ${ou(e.enderecoBairro, "bairro")}, ` +
      `${ou(e.enderecoCidade, "cidade")}/${ou(e.enderecoUf, "UF")}, CEP ${formatarCep(e.enderecoCep) || "[CEP NÃO INFORMADO]"}`
  );

  if (e.emailContato) partes.push(`endereço eletrônico ${e.emailContato}`);

  partes.push(
    `neste ato representada por ${ou(e.repNome, "nome do representante")}, ` +
      `${ou(e.repNacionalidade, "nacionalidade")}, ${ou(e.repEstadoCivil, "estado civil")}, ` +
      `${ou(e.repProfissao ?? e.repCargo, "profissão/cargo")}, portador(a) do RG nº ${ou(e.repRg, "RG")} e ` +
      `inscrito(a) no CPF/MF sob o nº ${formatarDocumento(e.repCpf) || "[CPF DO REPRESENTANTE NÃO INFORMADO]"}` +
      `${e.repCargo ? `, na qualidade de ${e.repCargo}` : ""}`
  );

  return partes.join(", ");
}

/** "CNPJ 00.000.000/0000-00" — como aparece no bloco de assinatura. */
function identificacaoLicitante(e: LicitanteEmpresa): string {
  return `CNPJ ${formatarDocumento(e.documento) || "[CNPJ NÃO INFORMADO]"}${e.repNome ? ` — p.p. ${e.repNome}` : ""}`;
}

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
  return qualificarLicitante(ctx.licitante);
}

function assinanteDoLicitante(ctx: ContextoDocumento) {
  if (!ctx.licitante) return [];
  return [
    {
      nome: ctx.licitante.repNome || ctx.licitante.nome,
      papel: ctx.licitante.repCargo || "Representante legal",
      identificacao: identificacaoLicitante(ctx.licitante),
    },
  ];
}

// =====================================================================
// Termo de credenciamento
// =====================================================================

export function textoLicitCredenciamento(ctx: ContextoDocumento): TextoDeclaracao {
  const { orgao, modalidade, numero } = dadosDoCertame(ctx);
  const nomeRepresentante = campo(ctx, "nomeCredenciado") || ctx.licitante?.repNome || "[NOME DO CREDENCIADO]";
  const rgRepresentante = campo(ctx, "rgCredenciado") || ctx.licitante?.repRg || "[RG DO CREDENCIADO]";
  const cpfRepresentante = campo(ctx, "cpfCredenciado") || ctx.licitante?.repCpf || "[CPF DO CREDENCIADO]";

  return {
    titulo: "Termo de Credenciamento",
    paragrafos: [
      `Através do presente, credenciamos o(a) Sr.(a) ${nomeRepresentante}, portador(a) do RG nº ${rgRepresentante} ` +
        `e do CPF nº ${cpfRepresentante}, a participar da licitação instaurada por ${orgao}, na modalidade ` +
        `${modalidade} nº ${numero}, na qualidade de representante legal, outorgando-lhe poderes para ` +
        "pronunciar-se em nome da empresa, bem como formular propostas, ofertar lances verbais, renunciar " +
        "direitos, renunciar ou desistir de recursos e praticar todos os demais atos inerentes ao certame.",
    ],
    assinantes: assinanteDoLicitante(ctx),
  };
}

export function gerarLicitCredenciamento(ctx: ContextoDocumento): MontagemDocumento {
  return montar(textoLicitCredenciamento(ctx));
}

// =====================================================================
// Inexistência de fato superveniente impeditivo da habilitação
// =====================================================================

export function textoLicitFatoSuperveniente(ctx: ContextoDocumento): TextoDeclaracao {
  return {
    titulo: "Declaração de Inexistência de Fato Superveniente Impeditivo à Habilitação",
    paragrafos: [
      `${licitanteOuAviso(ctx)}, doravante denominada **DECLARANTE**.`,
      "A DECLARANTE declara, sob as penas da lei, que até a presente data inexiste fato superveniente " +
        "impeditivo de sua habilitação no presente processo licitatório, ciente da obrigatoriedade de declarar " +
        "ocorrências posteriores.",
    ],
    assinantes: assinanteDoLicitante(ctx),
  };
}

export function gerarLicitFatoSuperveniente(ctx: ContextoDocumento): MontagemDocumento {
  return montar(textoLicitFatoSuperveniente(ctx));
}

// =====================================================================
// Não emprega menor — art. 7º, XXXIII, CF
// =====================================================================

export function textoLicitNaoEmpregaMenor(ctx: ContextoDocumento): TextoDeclaracao {
  return {
    titulo: "Declaração de Que Não Emprega Menores",
    paragrafos: [
      `${licitanteOuAviso(ctx)}, doravante denominada **DECLARANTE**.`,
      "A DECLARANTE, por intermédio de seu representante legal, declara, para os fins do disposto no inciso " +
        "XXXIII do art. 7º da Constituição Federal e no inciso V do art. 27 da Lei nº 8.666, de 21 de junho de " +
        "1993, acrescido pela Lei nº 9.854, de 27 de outubro de 1999, que não emprega menor de dezoito anos em " +
        "trabalho noturno, perigoso ou insalubre, e não emprega menor de dezesseis anos em qualquer trabalho, " +
        "salvo na condição de aprendiz, a partir de quatorze anos.",
    ],
    assinantes: assinanteDoLicitante(ctx),
  };
}

export function gerarLicitNaoEmpregaMenor(ctx: ContextoDocumento): MontagemDocumento {
  return montar(textoLicitNaoEmpregaMenor(ctx));
}

// =====================================================================
// Pleno atendimento aos requisitos de habilitação
// =====================================================================

export function textoLicitPlenoAtendimento(ctx: ContextoDocumento): TextoDeclaracao {
  const { orgao, modalidade, numero } = dadosDoCertame(ctx);

  return {
    titulo: "Declaração de Pleno Atendimento aos Requisitos de Habilitação",
    paragrafos: [
      `${licitanteOuAviso(ctx)}, doravante denominada **DECLARANTE**.`,
      `A DECLARANTE, por intermédio de seu representante legal, declara, para fins de participação em ${orgao}, ` +
        `na modalidade ${modalidade} nº ${numero}, que atende plenamente aos requisitos de habilitação exigidos ` +
        "no respectivo edital, nos termos do inciso VII do art. 4º da Lei nº 10.520, de 17 de julho de 2002, ou " +
        "do dispositivo equivalente da Lei nº 14.133, de 1º de abril de 2021, conforme a modalidade do certame.",
    ],
    assinantes: assinanteDoLicitante(ctx),
  };
}

export function gerarLicitPlenoAtendimento(ctx: ContextoDocumento): MontagemDocumento {
  return montar(textoLicitPlenoAtendimento(ctx));
}

// =====================================================================
// Microempresa / Empresa de Pequeno Porte
// =====================================================================

export function textoLicitMeEpp(ctx: ContextoDocumento): TextoDeclaracao {
  return {
    titulo: "Declaração de Microempresa ou Empresa de Pequeno Porte",
    paragrafos: [
      `${licitanteOuAviso(ctx)}, doravante denominada **DECLARANTE**.`,
      "A DECLARANTE, por intermédio de seu representante legal, declara que é Microempresa ou Empresa de " +
        "Pequeno Porte, nos termos do enquadramento previsto na Lei Complementar nº 123, de 14 de dezembro de " +
        "2006, com as alterações da Lei Complementar nº 147, de 7 de agosto de 2014, cujos termos declara " +
        "conhecer na íntegra, e não possuir qualquer dos impedimentos previstos nos §§ 4º e seguintes do art. 3º " +
        "da mesma lei, estando apta, portanto, a exercer o direito de preferência como critério de desempate e " +
        "o benefício da regularização fiscal tardia no procedimento licitatório.",
      "Por ser verdade, firma a presente sob as penas da lei.",
    ],
    assinantes: assinanteDoLicitante(ctx),
  };
}

export function gerarLicitMeEpp(ctx: ContextoDocumento): MontagemDocumento {
  return montar(textoLicitMeEpp(ctx));
}

// =====================================================================
// Ponte entre o texto e os dois formatos de saída
// =====================================================================

function montar(t: TextoDeclaracao): MontagemDocumento {
  return {
    titulo: t.titulo,
    corpo: t.paragrafos.map((p) => paragrafoRico(p)),
    assinantes: t.assinantes,
    comTestemunhas: false,
    semLocalEData: false,
  };
}

/**
 * O texto de cada declaração, pela mesma chave usada no catálogo de
 * documentos. É por aqui que a geração em PDF (assinável) chega ao conteúdo,
 * sem duplicar uma linha de redação.
 */
export const TEXTO_DECLARACAO_LICITACAO: Record<string, (ctx: ContextoDocumento) => TextoDeclaracao> = {
  LICIT_CREDENCIAMENTO: textoLicitCredenciamento,
  LICIT_FATO_SUPERVENIENTE: textoLicitFatoSuperveniente,
  LICIT_NAO_EMPREGA_MENOR: textoLicitNaoEmpregaMenor,
  LICIT_PLENO_ATENDIMENTO: textoLicitPlenoAtendimento,
  LICIT_ME_EPP: textoLicitMeEpp,
};
