/**
 * Documentos que protegem a informação e a posição do intermediário:
 * NDA, NCNDA e IMFPA.
 */
import { clausulaTitulo, item, paragrafo, paragrafoRico, tabela } from "../base";
import { apelidosUnicos, identificacao, nomeCurto, qualificarComApelido } from "../qualificacao";
import { assinantesDe, clausulaForo, fechamentoEletronico } from "./comum";
import {
  campo,
  campoNumero,
  campoSim,
  descreverAtivo,
  foro,
  parte,
  partesPor,
  valorReferencia,
  type ContextoDocumento,
} from "../contexto";
import type { MontagemDocumento } from "../montagem";
import { moedaComExtenso, percentualComExtenso, moeda } from "@/lib/formato";

// =====================================================================
// NDA — Acordo de Confidencialidade
// =====================================================================

export function gerarNDA(ctx: ContextoDocumento): MontagemDocumento {
  const cedente = parte(ctx, "CEDENTE");
  const cessionario = parte(ctx, "CESSIONARIO");
  const intermediarios = partesPor(ctx, "INTERMEDIARIO");

  const prazoMeses = campoNumero(ctx, "prazoMeses", 24) ?? 24;
  const multaInformada = campoNumero(ctx, "multa");
  const referencia = valorReferencia(ctx);
  const multa = multaInformada ?? (referencia != null ? referencia * 0.1 : null);
  const objeto = campo(ctx, "objeto") || descreverAtivo(ctx);

  const corpo = [];

  // ---- qualificação das partes ----
  corpo.push(clausulaTitulo("PARTES"));
  if (cedente) corpo.push(paragrafoRico(`${qualificarComApelido(cedente.pessoa, "Parte Reveladora")};`));
  if (cessionario) corpo.push(paragrafoRico(`${qualificarComApelido(cessionario.pessoa, "Parte Receptora")};`));
  const apelidosIntervenientes = apelidosUnicos("Interveniente", intermediarios.length);
  intermediarios.forEach((i, indice) => {
    corpo.push(paragrafoRico(`${qualificarComApelido(i.pessoa, apelidosIntervenientes[indice])};`));
  });
  corpo.push(
    paragrafo(
      "As partes acima qualificadas, doravante designadas em conjunto como PARTES e isoladamente como PARTE, " +
        "têm entre si justo e acordado o presente Acordo de Confidencialidade, que se regerá pelas cláusulas seguintes."
    )
  );

  // ---- cláusulas ----
  corpo.push(clausulaTitulo("CLÁUSULA PRIMEIRA — DO OBJETO"));
  corpo.push(
    item(
      "1.1.",
      `O presente acordo tem por objeto proteger as informações trocadas entre as PARTES em razão das tratativas relativas a ${objeto}.`
    )
  );
  corpo.push(
    item(
      "1.2.",
      "A celebração deste acordo não obriga qualquer das PARTES a concluir o negócio, nem cria exclusividade, " +
        "preferência ou expectativa de contratação, salvo disposição expressa em instrumento próprio."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA SEGUNDA — DAS INFORMAÇÕES CONFIDENCIAIS"));
  corpo.push(
    item(
      "2.1.",
      "Considera-se INFORMAÇÃO CONFIDENCIAL toda informação, em qualquer suporte, revelada por uma PARTE à outra " +
        "em razão das tratativas, incluindo, sem limitação: a identidade dos titulares e das contrapartes; a " +
        "existência, a origem, os números e a documentação do ativo; valores, deságios, prazos e condições de " +
        "pagamento; pareceres, laudos, certidões e resultados de auditoria; e a própria existência das tratativas."
    )
  );
  corpo.push(
    item(
      "2.2.",
      "Não é confidencial a informação que: (a) já era de domínio público na data da revelação; (b) tornou-se " +
        "pública sem culpa da PARTE Receptora; (c) já era comprovadamente conhecida da PARTE Receptora antes da " +
        "revelação; ou (d) deva ser revelada por ordem judicial, administrativa ou legal, hipótese em que a PARTE " +
        "Receptora comunicará imediatamente a PARTE Reveladora, para que esta possa buscar as medidas cabíveis."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA TERCEIRA — DAS OBRIGAÇÕES"));
  corpo.push(
    item(
      "3.1.",
      "A PARTE Receptora obriga-se a: (a) manter as INFORMAÇÕES CONFIDENCIAIS em sigilo; (b) utilizá-las " +
        "exclusivamente para avaliar o negócio objeto deste acordo; (c) não reproduzi-las nem divulgá-las a " +
        "terceiros sem autorização escrita e prévia; (d) restringir o acesso a sócios, empregados e assessores " +
        "que precisem conhecê-las, respondendo pelos atos destes; e (e) devolver ou destruir o material recebido, " +
        "no prazo de 5 (cinco) dias, quando solicitado ou ao término das tratativas."
    )
  );
  corpo.push(
    item(
      "3.2.",
      "O tratamento de dados pessoais eventualmente contidos nas informações observará a Lei nº 13.709/2018 (LGPD), " +
        "limitando-se à finalidade prevista na cláusula 1.1, vedado o compartilhamento com terceiros não autorizados."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA QUARTA — DO PRAZO"));
  corpo.push(
    item(
      "4.1.",
      `Este acordo vigora por ${prazoMeses} (${prazoMeses === 24 ? "vinte e quatro" : prazoMeses}) meses contados da ` +
        "assinatura, permanecendo o dever de sigilo por igual período após o término das tratativas, ainda que o " +
        "negócio não se concretize."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA QUINTA — DA RESPONSABILIDADE"));
  corpo.push(
    item(
      "5.1.",
      multa != null
        ? `A quebra de qualquer obrigação deste acordo sujeita a PARTE infratora ao pagamento de multa de ${moedaComExtenso(multa)}, ` +
            "sem prejuízo da indenização por perdas e danos que a excederem, na forma do art. 416, parágrafo único, do Código Civil."
        : "A quebra de qualquer obrigação deste acordo sujeita a PARTE infratora à reparação integral das perdas e " +
            "danos causados, na forma dos arts. 389 e 927 do Código Civil."
    )
  );
  corpo.push(
    item(
      "5.2.",
      "As PARTES reconhecem que a violação do sigilo causa dano de difícil reparação, autorizando desde já o " +
        "requerimento de tutela de urgência para fazer cessar a divulgação."
    )
  );

  corpo.push(...clausulaForo(ctx, "CLÁUSULA SEXTA"));

  corpo.push(
    paragrafo(
      "E, por estarem assim justas e acordadas, as PARTES firmam o presente instrumento, em via eletrônica, " +
        "que produzirá seus efeitos independentemente de registro, nos termos do art. 10, § 2º, da MP 2.200-2/2001.",
      { espacoDepois: 240 }
    )
  );

  return {
    titulo: "Acordo de Confidencialidade",
    subtitulo: "Non-Disclosure Agreement — NDA",
    corpo,
    assinantes: assinantesDe(ctx, ["CEDENTE", "CESSIONARIO", "INTERMEDIARIO"]),
    comTestemunhas: false,
  };
}

// =====================================================================
// NCNDA — Sigilo e Não Circunvenção
// =====================================================================

export function gerarNCNDA(ctx: ContextoDocumento): MontagemDocumento {
  const intermediarios = partesPor(ctx, "INTERMEDIARIO");
  const cedente = parte(ctx, "CEDENTE");
  const cessionario = parte(ctx, "CESSIONARIO");

  const prazoMeses = campoNumero(ctx, "prazoMeses", 24) ?? 24;
  const comissao = campoNumero(ctx, "comissaoPercentual");
  const multaPct = campoNumero(ctx, "multaPercentual", 10) ?? 10;
  const futuras = campoSim(ctx, "transacoesFuturas", true);
  const referencia = valorReferencia(ctx);

  const corpo = [];

  corpo.push(clausulaTitulo("PARTES"));
  const apelidosIntermediarios = apelidosUnicos("Intermediário", intermediarios.length);
  intermediarios.forEach((i, indice) => {
    corpo.push(paragrafoRico(`${qualificarComApelido(i.pessoa, apelidosIntermediarios[indice])};`));
  });

  // Cedente e cessionário são ambos "parte apresentada"; com os dois presentes,
  // recebem numeração para que o texto possa se referir a cada um.
  const apresentadas = [cedente, cessionario].filter(Boolean);
  const apelidosApresentadas = apelidosUnicos("Parte Apresentada", apresentadas.length);
  apresentadas.forEach((p, indice) => {
    corpo.push(paragrafoRico(`${qualificarComApelido(p!.pessoa, apelidosApresentadas[indice])};`));
  });

  corpo.push(
    paragrafo(
      "As PARTES celebram o presente Acordo de Não Circunvenção e Confidencialidade (NCNDA), regido pelas " +
        "cláusulas a seguir e, no que couber, pelos arts. 422, 425 e 722 a 729 do Código Civil."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA PRIMEIRA — DO OBJETO E DA APRESENTAÇÃO"));
  corpo.push(
    item(
      "1.1.",
      `O INTERMEDIÁRIO apresenta às demais PARTES a oportunidade relativa a ${descreverAtivo(ctx)}, ` +
        "bem como as pessoas, fontes, contatos e informações necessárias à sua realização."
    )
  );
  corpo.push(
    item(
      "1.2.",
      "As PARTES reconhecem que não conheciam previamente as contrapartes, fontes e oportunidades ora " +
        "apresentadas, e que tomaram conhecimento delas exclusivamente por intermédio do INTERMEDIÁRIO."
    )
  );

  // Cadeia de intermediação — é isto que o documento realmente protege.
  if (intermediarios.length > 1) {
    corpo.push(
      item(
        "1.3.",
        "A cadeia de intermediação reconhecida pelas PARTES, na ordem de apresentação, é a constante do quadro abaixo:"
      )
    );
    corpo.push(
      tabela(
        ["Ordem", "Intermediário", "Documento", "Participação"],
        intermediarios.map((i, indice) => [
          String(i.ordemCadeia ?? indice + 1),
          nomeCurto(i.pessoa),
          identificacao(i.pessoa).replace(/^(CPF|CNPJ) /, ""),
          i.comissaoPercentual != null ? `${Number(i.comissaoPercentual)}%` : "conforme termo próprio",
        ])
      )
    );
    corpo.push(paragrafo(""));
  }

  corpo.push(clausulaTitulo("CLÁUSULA SEGUNDA — DA NÃO CIRCUNVENÇÃO"));
  corpo.push(
    item(
      "2.1.",
      "As PARTES obrigam-se a não contatar, negociar, contratar ou realizar qualquer operação, direta ou " +
        "indiretamente, por si, por interposta pessoa, por empresa coligada, controlada, controladora ou por " +
        "parente até o terceiro grau, com as contrapartes, fontes ou contatos apresentados pelo INTERMEDIÁRIO, " +
        "com o propósito ou o efeito de excluí-lo da operação ou de reduzir a remuneração que lhe é devida."
    )
  );
  corpo.push(
    item(
      "2.2.",
      futuras
        ? "A obrigação alcança não apenas a operação ora apresentada, mas também qualquer operação futura, " +
            "renovação, aditamento, substituição ou desdobramento celebrado entre as mesmas PARTES ou entre elas e " +
            "as contrapartes apresentadas, durante a vigência deste acordo."
        : "A obrigação restringe-se à operação ora apresentada e às suas renovações e aditamentos diretos."
    )
  );
  corpo.push(
    item(
      "2.3.",
      "A tentativa de contornar o INTERMEDIÁRIO mediante alteração do desenho da operação, troca de veículo " +
        "societário, interposição de terceiros ou fracionamento do negócio configura circunvenção para todos os " +
        "efeitos deste acordo."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA TERCEIRA — DA CONFIDENCIALIDADE"));
  corpo.push(
    item(
      "3.1.",
      "Todas as informações reveladas em razão deste acordo são confidenciais, aplicando-se as mesmas obrigações " +
        "de sigilo, uso restrito e devolução previstas em acordo de confidencialidade, e observando-se a Lei nº " +
        "13.709/2018 quanto a dados pessoais."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA QUARTA — DA REMUNERAÇÃO PROTEGIDA"));
  corpo.push(
    item(
      "4.1.",
      comissao != null
        ? `Fica reconhecida em favor do INTERMEDIÁRIO a remuneração de ${percentualComExtenso(comissao)}, ` +
            "calculada sobre o valor bruto de cada operação efetivamente concluída em decorrência da apresentação " +
            "aqui reconhecida, devida ainda que a conclusão ocorra após o término deste acordo, na forma do art. 725 " +
            "do Código Civil."
        : "Fica reconhecida em favor do INTERMEDIÁRIO a remuneração ajustada em termo próprio, devida ainda que a " +
            "conclusão do negócio ocorra após o término deste acordo, na forma do art. 725 do Código Civil."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA QUINTA — DO PRAZO"));
  corpo.push(
    item(
      "5.1.",
      `Este acordo vigora por ${prazoMeses} meses contados da assinatura, renovando-se automaticamente por ` +
        "igual período caso nenhuma das PARTES manifeste o contrário com 30 (trinta) dias de antecedência."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA SEXTA — DA MULTA"));
  const baseMulta = referencia != null ? referencia * (multaPct / 100) : null;
  corpo.push(
    item(
      "6.1.",
      `O descumprimento de qualquer obrigação deste acordo sujeita a PARTE infratora ao pagamento de multa ` +
        `equivalente a ${percentualComExtenso(multaPct)} do valor da operação realizada com circunvenção` +
        (baseMulta != null ? `, o que corresponde, nesta data, a ${moeda(baseMulta)}` : "") +
        ", sem prejuízo da remuneração devida ao INTERMEDIÁRIO e das perdas e danos que a excederem."
    )
  );
  corpo.push(
    item(
      "6.2.",
      "As PARTES reconhecem este instrumento como título executivo extrajudicial, nos termos do art. 784, III, " +
        "do Código de Processo Civil, quando assinado por duas testemunhas."
    )
  );

  corpo.push(...clausulaForo(ctx, "CLÁUSULA SÉTIMA"));

  corpo.push(
    paragrafo(
      "E, por estarem justas e contratadas, as PARTES firmam o presente instrumento em via eletrônica, na " +
        "presença das testemunhas abaixo.",
      { espacoDepois: 240 }
    )
  );

  return {
    titulo: "Acordo de Não Circunvenção e Confidencialidade",
    subtitulo: "Non-Circumvention, Non-Disclosure Agreement — NCNDA",
    corpo,
    assinantes: assinantesDe(ctx, ["INTERMEDIARIO", "CEDENTE", "CESSIONARIO"]),
    comTestemunhas: true,
  };
}

// =====================================================================
// IMFPA — Acordo Irrevogável de Comissão
// =====================================================================

export function gerarIMFPA(ctx: ContextoDocumento): MontagemDocumento {
  const intermediarios = partesPor(ctx, "INTERMEDIARIO");
  const pagador = parte(ctx, "CESSIONARIO") ?? parte(ctx, "CEDENTE");

  const comissao = campoNumero(ctx, "comissaoPercentual");
  const base = campo(ctx, "baseCalculo", "valor bruto de cada operação liquidada");
  const prazoDias = campoNumero(ctx, "prazoPagamentoDias", 3) ?? 3;
  const dadosBancarios = campo(ctx, "bancoDados");

  const corpo = [];

  corpo.push(clausulaTitulo("PARTES"));
  if (pagador) corpo.push(paragrafoRico(`${qualificarComApelido(pagador.pessoa, "Pagador")};`));
  const apelidosBeneficiarios = apelidosUnicos("Beneficiário", intermediarios.length);
  intermediarios.forEach((i, indice) => {
    corpo.push(paragrafoRico(`${qualificarComApelido(i.pessoa, apelidosBeneficiarios[indice])};`));
  });

  corpo.push(
    paragrafo(
      "As PARTES celebram o presente Acordo Irrevogável de Proteção de Comissão, pelo qual o PAGADOR se obriga " +
        "a pagar diretamente ao BENEFICIÁRIO a remuneração adiante ajustada."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA PRIMEIRA — DA OPERAÇÃO"));
  corpo.push(item("1.1.", `O presente acordo refere-se à operação relativa a ${descreverAtivo(ctx)}.`));

  corpo.push(clausulaTitulo("CLÁUSULA SEGUNDA — DA COMISSÃO"));
  corpo.push(
    item(
      "2.1.",
      comissao != null
        ? `O PAGADOR pagará ao BENEFICIÁRIO comissão de ${percentualComExtenso(comissao)}, calculada sobre o ${base}.`
        : `O PAGADOR pagará ao BENEFICIÁRIO a comissão ajustada, calculada sobre o ${base}.`
    )
  );

  if (intermediarios.length > 1) {
    corpo.push(item("2.2.", "A comissão será rateada entre os BENEFICIÁRIOS conforme o quadro abaixo:"));
    corpo.push(
      tabela(
        ["Beneficiário", "Documento", "Participação"],
        intermediarios.map((i) => [
          nomeCurto(i.pessoa),
          identificacao(i.pessoa).replace(/^(CPF|CNPJ) /, ""),
          i.comissaoPercentual != null ? `${Number(i.comissaoPercentual)}%` : "a definir",
        ])
      )
    );
    corpo.push(paragrafo(""));
  }

  corpo.push(clausulaTitulo("CLÁUSULA TERCEIRA — DO PAGAMENTO"));
  corpo.push(
    item(
      "3.1.",
      `O pagamento será efetuado em até ${prazoDias} (${prazoDias}) dias úteis contados da liquidação financeira de ` +
        "cada operação ou parcela, simultaneamente ao recebimento pelo PAGADOR, mediante transferência para a conta indicada."
    )
  );
  if (dadosBancarios) {
    corpo.push(item("3.2.", `Dados para pagamento: ${dadosBancarios}.`));
  }

  corpo.push(clausulaTitulo("CLÁUSULA QUARTA — DA IRREVOGABILIDADE"));
  corpo.push(
    item(
      "4.1.",
      "O presente acordo é celebrado em caráter irrevogável e irretratável, obrigando as PARTES, seus herdeiros " +
        "e sucessores a qualquer título, e não poderá ser cancelado, alterado ou revogado unilateralmente."
    )
  );
  corpo.push(
    item(
      "4.2.",
      "Para garantia do BENEFICIÁRIO, o PAGADOR cede desde já, na forma do art. 286 do Código Civil, a parcela do " +
        "crédito correspondente à comissão, autorizando a instituição financeira responsável pela liquidação a " +
        "efetuar o pagamento diretamente ao BENEFICIÁRIO."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA QUINTA — DA MORA"));
  corpo.push(
    item(
      "5.1.",
      "O atraso no pagamento sujeita o PAGADOR a multa de 2% (dois por cento), juros de 1% (um por cento) ao mês " +
        "e correção monetária, sem prejuízo da execução do valor devido."
    )
  );
  corpo.push(
    item(
      "5.2.",
      "As PARTES reconhecem este instrumento como título executivo extrajudicial, nos termos do art. 784, III, do " +
        "Código de Processo Civil."
    )
  );

  corpo.push(...clausulaForo(ctx, "CLÁUSULA SEXTA"));

  return {
    titulo: "Acordo Irrevogável de Proteção de Comissão",
    subtitulo: "Irrevocable Master Fee Protection Agreement — IMFPA",
    corpo,
    assinantes: assinantesDe(ctx, ["CESSIONARIO", "CEDENTE", "INTERMEDIARIO"]),
    comTestemunhas: true,
  };
}
