/**
 * Transferência do ativo: proposta, cessão de crédito, cessão de direitos,
 * cessão de precatório e a notificação ao devedor.
 */
import { clausulaTitulo, item, paragrafo, paragrafoRico, tabela, espaco } from "../base";
import { apelidosUnicos, qualificar, qualificarComApelido, nomeCurto, identificacao } from "../qualificacao";
import {
  campo,
  campoNumero,
  campoSim,
  descreverAtivo,
  descreverValores,
  linhasResumoAtivo,
  parte,
  partesPor,
  valorReferencia,
  type ContextoDocumento,
} from "../contexto";
import type { MontagemDocumento } from "../montagem";
import { assinantesDe, clausulaForo, contadorClausulas, fechamentoEletronico } from "./comum";
import { moedaComExtenso, percentualComExtenso, dataExtenso, dataCurta } from "@/lib/formato";

/** Quadro-resumo do ativo, usado em quase todos os contratos de transferência. */
function quadroDoAtivo(ctx: ContextoDocumento) {
  const linhas = linhasResumoAtivo(ctx);
  if (linhas.length === 0) return [];
  return [tabela(["Item", "Descrição"], linhas), espaco(200)];
}

/** Declarações do cedente — é a cláusula que sustenta a operação se der errado. */
function declaracoesDoCedente(cabecalho: string, prefixoItem: string, comPrecatorio = false) {
  const corpo = [
    clausulaTitulo(cabecalho),
    item(`${prefixoItem}1.`, "O CEDENTE declara, sob as penas da lei, que:"),
    paragrafo(
      "(a) é o legítimo e único titular do crédito ora cedido, que lhe pertence de forma livre e desembaraçada;"
    ),
    paragrafo(
      "(b) o crédito existe, é certo e não foi anteriormente cedido, dado em pagamento, penhorado, arrestado, " +
        "caucionado, compensado ou gravado com qualquer ônus, nem é objeto de discussão sobre a sua titularidade;"
    ),
    paragrafo(
      "(c) não há ação, execução, medida cautelar ou procedimento administrativo que possa afetar a existência, " +
        "o valor ou a exigibilidade do crédito, nem se encontra em recuperação judicial, extrajudicial ou falência;"
    ),
    paragrafo(
      "(d) todos os documentos entregues ao CESSIONÁRIO são autênticos e refletem a realidade, respondendo o " +
        "CEDENTE por qualquer divergência;"
    ),
    paragrafo(
      "(e) os recursos e o ativo envolvidos têm origem lícita, não decorrendo de qualquer das infrações previstas " +
        "na Lei nº 9.613/1998;"
    ),
  ];

  if (comPrecatorio) {
    corpo.push(
      paragrafo(
        "(f) não houve renúncia, compensação com débitos tributários, nem habilitação de terceiros sobre o " +
          "precatório, e o CEDENTE não é beneficiário de acordo de parcelamento que altere o valor a receber."
      )
    );
  }

  corpo.push(
    paragrafo(
      "As declarações acima são condição essencial do negócio. A falsidade de qualquer delas autoriza a resolução " +
        "do contrato, a devolução integral dos valores pagos e a cobrança da multa prevista, sem prejuízo das " +
        "responsabilidades civil e penal cabíveis."
    )
  );

  return corpo;
}

// =====================================================================
// LOI — Carta de Intenção
// =====================================================================

export function gerarLOI(ctx: ContextoDocumento): MontagemDocumento {
  const proponente = parte(ctx, "CESSIONARIO");
  const destinatario = parte(ctx, "CEDENTE");

  const validadeDias = campoNumero(ctx, "validadeDias", 15) ?? 15;
  const vinculante = campoSim(ctx, "vinculante", false);
  const condicoes = campo(ctx, "condicoes");
  const exclusividadeDias = campoNumero(ctx, "exclusividadeDias", 30) ?? 30;

  const corpo = [];

  corpo.push(paragrafo(`Ao(À) ${destinatario ? nomeCurto(destinatario.pessoa) : "[DESTINATÁRIO NÃO INFORMADO]"}`));
  corpo.push(paragrafo(`Ref.: Proposta de aquisição — ${ctx.operacao?.titulo ?? "operação"}`, { negrito: true }));
  corpo.push(espaco(200));

  corpo.push(
    paragrafoRico(
      `${proponente ? qualificarComApelido(proponente.pessoa, "Proponente") : "[PROPONENTE NÃO INFORMADO]"}, ` +
        "vem apresentar a presente Carta de Intenção, nos termos e condições a seguir."
    )
  );

  corpo.push(clausulaTitulo("1. DO ATIVO"));
  corpo.push(paragrafo(`A proposta tem por objeto ${descreverAtivo(ctx)}.`));
  corpo.push(...quadroDoAtivo(ctx));

  corpo.push(clausulaTitulo("2. DA PROPOSTA"));
  const valores = descreverValores(ctx);
  corpo.push(
    paragrafo(
      valores
        ? `O PROPONENTE oferece adquirir o ativo pelo ${valores}.`
        : "O PROPONENTE oferece adquirir o ativo nas condições ajustadas entre as partes."
    )
  );

  corpo.push(clausulaTitulo("3. DAS CONDIÇÕES"));
  corpo.push(
    paragrafo(
      condicoes ||
        "A proposta está condicionada à conclusão satisfatória da auditoria documental do ativo e da contraparte, " +
          "à apresentação das certidões exigidas e à inexistência de ônus, penhora ou cessão anterior."
    )
  );

  corpo.push(clausulaTitulo("4. DA VALIDADE E DA NATUREZA"));
  corpo.push(
    paragrafo(
      `A presente proposta é válida por ${validadeDias} (${validadeDias}) dias contados do recebimento, findos os ` +
        "quais caducará automaticamente, independentemente de aviso."
    )
  );
  corpo.push(
    paragrafo(
      vinculante
        ? "Esta Carta de Intenção tem caráter VINCULANTE. Aceita nos seus termos, obriga as partes à celebração do " +
            "contrato definitivo, respondendo a parte que se recusar pelas perdas e danos."
        : "Esta Carta de Intenção NÃO é vinculante quanto à obrigação de contratar. São vinculantes, contudo, e " +
            "desde já obrigam as partes, as disposições sobre confidencialidade, exclusividade e boa-fé nas " +
            "tratativas (art. 422 do Código Civil)."
    )
  );

  if (exclusividadeDias > 0) {
    corpo.push(clausulaTitulo("5. DA EXCLUSIVIDADE"));
    corpo.push(
      paragrafo(
        `Aceita a proposta, o DESTINATÁRIO obriga-se a não negociar o ativo com terceiros pelo prazo de ` +
          `${exclusividadeDias} (${exclusividadeDias}) dias, período destinado à auditoria e à formalização do contrato definitivo.`
      )
    );
  }

  corpo.push(clausulaTitulo("6. DA CONFIDENCIALIDADE"));
  corpo.push(
    paragrafo(
      "O conteúdo desta proposta é confidencial e não poderá ser divulgado a terceiros, salvo aos assessores das " +
        "partes vinculados ao mesmo dever de sigilo."
    )
  );

  return {
    titulo: "Carta de Intenção",
    subtitulo: "Letter of Intent — LOI",
    corpo,
    assinantes: assinantesDe(ctx, ["CESSIONARIO"]),
    comTestemunhas: false,
  };
}

// =====================================================================
// CESSÃO DE CRÉDITO
// =====================================================================

export function gerarCessaoCredito(ctx: ContextoDocumento): MontagemDocumento {
  return montarCessao(ctx, {
    titulo: "Instrumento Particular de Cessão de Crédito",
    subtitulo: "Arts. 286 a 298 do Código Civil",
    precatorio: false,
    direitos: false,
  });
}

export function gerarCessaoDireitos(ctx: ContextoDocumento): MontagemDocumento {
  return montarCessao(ctx, {
    titulo: "Instrumento Particular de Cessão de Direitos",
    subtitulo: "Arts. 286 a 298 do Código Civil e art. 109 do Código de Processo Civil",
    precatorio: false,
    direitos: true,
  });
}

export function gerarCessaoPrecatorio(ctx: ContextoDocumento): MontagemDocumento {
  return montarCessao(ctx, {
    titulo: "Instrumento Particular de Cessão de Precatório",
    subtitulo: "Art. 100, §§ 13 e 14, da Constituição Federal e arts. 286 a 298 do Código Civil",
    precatorio: true,
    direitos: false,
  });
}

function montarCessao(
  ctx: ContextoDocumento,
  opcoes: { titulo: string; subtitulo: string; precatorio: boolean; direitos: boolean }
): MontagemDocumento {
  const cedente = parte(ctx, "CEDENTE");
  const cessionario = parte(ctx, "CESSIONARIO");
  const anuentes = partesPor(ctx, "ANUENTE");
  const intermediarios = partesPor(ctx, "INTERMEDIARIO");

  const proSoluto = campo(ctx, "responsabilidade", "veritas") === "veritas";
  const formaPagamento = campo(ctx, "formaPagamento");
  const condicaoSuspensiva = campo(ctx, "condicaoSuspensiva");
  const multaPct = campoNumero(ctx, "multaPercentual", 10) ?? 10;
  const direitosCedidos = campo(ctx, "direitosCedidos");
  const litigioso = campoSim(ctx, "litigioso", false);
  const responsavelHabilitacao = campo(ctx, "responsavelHabilitacao", "cessionario");
  const irRetido = campo(ctx, "irRetido");

  const op = ctx.operacao;
  const moedaOp = ((op?.moeda ?? "BRL") as "BRL" | "USD" | "EUR");
  const valorPago = op?.valorNegociado != null ? Number(op.valorNegociado) : null;

  const c = contadorClausulas();
  const corpo = [];

  // ---- partes ----
  corpo.push(clausulaTitulo("PARTES"));
  corpo.push(
    paragrafoRico(
      cedente ? `${qualificarComApelido(cedente.pessoa, "Cedente")};` : "[CEDENTE NÃO INFORMADO]"
    )
  );
  corpo.push(
    paragrafoRico(
      cessionario ? `${qualificarComApelido(cessionario.pessoa, "Cessionário")};` : "[CESSIONÁRIO NÃO INFORMADO]"
    )
  );
  const apelidosAnuentes = apelidosUnicos("Anuente", anuentes.length);
  anuentes.forEach((a, indice) => {
    corpo.push(paragrafoRico(`${qualificarComApelido(a.pessoa, apelidosAnuentes[indice])};`));
  });

  const apelidosIntervenientes = apelidosUnicos("Interveniente Anuente", intermediarios.length);
  intermediarios.forEach((i, indice) => {
    corpo.push(paragrafoRico(`${qualificarComApelido(i.pessoa, apelidosIntervenientes[indice])};`));
  });

  corpo.push(
    paragrafo(
      "As PARTES acima qualificadas têm entre si justo e contratado o presente instrumento, que se regerá pelas " +
        "cláusulas e condições seguintes."
    )
  );

  // ---- objeto ----
  const cObjeto = c.proxima("DO OBJETO");
  corpo.push(clausulaTitulo(cObjeto.cabecalho));
  corpo.push(
    item(
      cObjeto.item(),
      opcoes.direitos && direitosCedidos
        ? `O CEDENTE cede e transfere ao CESSIONÁRIO os seguintes direitos: ${direitosCedidos}, decorrentes de ${descreverAtivo(ctx)}.`
        : `O CEDENTE cede e transfere ao CESSIONÁRIO, em caráter irrevogável e irretratável, a totalidade do ` +
            `crédito relativo a ${descreverAtivo(ctx)}.`
    )
  );
  corpo.push(...quadroDoAtivo(ctx));
  corpo.push(
    item(
      cObjeto.item(),
      "A cessão abrange o principal, a correção monetária, os juros, a multa e todos os acessórios do crédito, " +
        "vencidos e vincendos, bem como as garantias que o acompanham (art. 287 do Código Civil)."
    )
  );

  if (opcoes.precatorio) {
    corpo.push(
      item(
        cObjeto.item(),
        "As PARTES declaram ciência de que, nos termos do art. 100, § 13, da Constituição Federal, a cessão NÃO " +
          "transfere ao CESSIONÁRIO as preferências constitucionais decorrentes da natureza alimentar do crédito, " +
          "da idade, do estado de saúde ou da deficiência do titular originário."
      )
    );
  }

  if (opcoes.direitos && litigioso) {
    corpo.push(
      item(
        cObjeto.item(),
        "Tratando-se de direito litigioso, as PARTES declaram ciência de que a substituição processual do CEDENTE " +
          "pelo CESSIONÁRIO depende do consentimento da parte contrária (art. 109, § 1º, do Código de Processo " +
          "Civil), podendo o CESSIONÁRIO, em qualquer caso, intervir como assistente litisconsorcial."
      )
    );
  }

  // ---- preço ----
  const cPreco = c.proxima("DO PREÇO E DA FORMA DE PAGAMENTO");
  corpo.push(clausulaTitulo(cPreco.cabecalho));
  corpo.push(
    item(
      cPreco.item(),
      valorPago != null
        ? `O preço certo e ajustado da presente cessão é de ${moedaComExtenso(valorPago, moedaOp)}` +
            (op?.desagioPercentual != null
              ? `, correspondente ao valor de face com deságio de ${percentualComExtenso(Number(op.desagioPercentual))}.`
              : ".")
        : "O preço da presente cessão é o ajustado entre as PARTES, conforme discriminado a seguir."
    )
  );
  corpo.push(
    item(cPreco.item(), formaPagamento || "[FORMA DE PAGAMENTO NÃO INFORMADA — preencha antes de assinar]")
  );
  if (condicaoSuspensiva) {
    corpo.push(
      item(
        cPreco.item(),
        `A eficácia da presente cessão fica submetida à seguinte condição suspensiva (art. 125 do Código Civil): ${condicaoSuspensiva}`
      )
    );
  }
  corpo.push(
    item(
      cPreco.item(),
      "O pagamento será comprovado por recibo ou comprovante de transferência bancária, valendo como quitação " +
        "parcial ou total conforme o caso."
    )
  );

  // ---- responsabilidade ----
  const cResp = c.proxima("DA RESPONSABILIDADE DO CEDENTE");
  corpo.push(clausulaTitulo(cResp.cabecalho));
  corpo.push(
    item(
      cResp.item(),
      proSoluto
        ? "A cessão é feita PRO SOLUTO. O CEDENTE responde pela existência e pela legitimidade do crédito ao tempo " +
            "da cessão (art. 295 do Código Civil), mas NÃO responde pela solvência do devedor (art. 296)."
        : "A cessão é feita PRO SOLVENDO. Além da existência e da legitimidade do crédito, o CEDENTE responde " +
            "expressamente pela solvência do devedor, nos termos do art. 296 do Código Civil, obrigando-se a " +
            "restituir o preço recebido, com correção e juros, caso o crédito não seja satisfeito."
    )
  );

  // ---- declarações ----
  const cDecl = c.proxima("DAS DECLARAÇÕES E GARANTIAS DO CEDENTE");
  corpo.push(...declaracoesDoCedente(cDecl.cabecalho, cDecl.prefixo, opcoes.precatorio));

  // ---- notificação / habilitação ----
  const cNotif = c.proxima("DA NOTIFICAÇÃO E DA EFICÁCIA PERANTE TERCEIROS");
  corpo.push(clausulaTitulo(cNotif.cabecalho));
  if (opcoes.precatorio) {
    const quem =
      responsavelHabilitacao === "cedente"
        ? "o CEDENTE"
        : responsavelHabilitacao === "ambos"
          ? "as PARTES, em conjunto"
          : "o CESSIONÁRIO";
    corpo.push(
      item(
        cNotif.item(),
        "As PARTES declaram ciência de que, nos termos do art. 100, § 14, da Constituição Federal, a cessão só " +
          "produzirá efeitos após comunicação, por meio de petição protocolizada, ao tribunal de origem e à " +
          "entidade devedora."
      )
    );
    corpo.push(
      item(
        cNotif.item(),
        `Fica desde já ajustado que ${quem} protocolará a petição de habilitação perante o tribunal de origem no ` +
          "prazo de 10 (dez) dias contados da assinatura deste instrumento, comprovando o ato à outra parte."
      )
    );
    corpo.push(
      item(
        cNotif.item(),
        "O CEDENTE obriga-se a assinar toda a documentação complementar exigida pelo tribunal, incluindo " +
          "declarações, procurações por instrumento público e reconhecimento de firma, sob pena da multa prevista " +
          "neste contrato."
      )
    );
  } else {
    corpo.push(
      item(
        cNotif.item(),
        "A cessão somente produzirá efeitos perante o devedor depois que a este for notificada (art. 290 do Código " +
          "Civil). Antes da notificação, o pagamento feito ao CEDENTE libera validamente o devedor (art. 292)."
      )
    );
    corpo.push(
      item(
        cNotif.item(),
        "O CEDENTE obriga-se a firmar, em conjunto com o CESSIONÁRIO, a notificação ao devedor no prazo de 5 " +
          "(cinco) dias contados da assinatura deste instrumento, bem como a repassar imediatamente ao CESSIONÁRIO " +
          "qualquer valor que venha a receber relativo ao crédito cedido."
      )
    );
  }
  corpo.push(
    item(
      cNotif.item(),
      "O CEDENTE entrega neste ato ao CESSIONÁRIO todos os documentos comprobatórios do crédito, na forma do art. " +
        "290 e seguintes do Código Civil."
    )
  );

  if (opcoes.precatorio && irRetido) {
    const cTrib = c.proxima("DO TRATAMENTO TRIBUTÁRIO");
    corpo.push(clausulaTitulo(cTrib.cabecalho));
    corpo.push(item(cTrib.item(), irRetido));
    corpo.push(
      item(
        cTrib.item(),
        "As PARTES reconhecem que a cessão não altera a natureza do crédito para fins tributários nem afasta as " +
          "retenções cabíveis na origem."
      )
    );
  }

  // ---- multa ----
  const referencia = valorReferencia(ctx);
  const multaValor = referencia != null ? referencia * (multaPct / 100) : null;
  const cMulta = c.proxima("DA MULTA");
  corpo.push(clausulaTitulo(cMulta.cabecalho));
  corpo.push(
    item(
      cMulta.item(),
      `O descumprimento de qualquer obrigação prevista neste instrumento sujeita a PARTE infratora ao pagamento de ` +
        `multa de ${percentualComExtenso(multaPct)} sobre o valor da cessão` +
        (multaValor != null ? `, equivalente a ${moedaComExtenso(multaValor, moedaOp)}` : "") +
        ", sem prejuízo das perdas e danos que a excederem e da execução específica das obrigações."
    )
  );

  // ---- disposições finais ----
  const cFinal = c.proxima("DAS DISPOSIÇÕES FINAIS");
  corpo.push(clausulaTitulo(cFinal.cabecalho));
  corpo.push(
    item(
      cFinal.item(),
      "Este instrumento obriga as PARTES, seus herdeiros e sucessores a qualquer título, e constitui título " +
        "executivo extrajudicial, nos termos do art. 784, III, do Código de Processo Civil."
    )
  );
  corpo.push(
    item(
      cFinal.item(),
      "A tolerância quanto ao descumprimento de qualquer obrigação não importa novação nem renúncia ao direito de " +
        "exigi-la posteriormente."
    )
  );
  corpo.push(
    item(
      cFinal.item(),
      "As PARTES declaram que os dados pessoais tratados neste instrumento observam a Lei nº 13.709/2018, " +
        "limitando-se seu uso à execução deste contrato e ao cumprimento de obrigação legal."
    )
  );

  corpo.push(...clausulaForo(ctx, c.proxima("DO FORO").cabecalho));
  corpo.push(fechamentoEletronico(true));

  return {
    titulo: opcoes.titulo,
    subtitulo: opcoes.subtitulo,
    corpo,
    assinantes: assinantesDe(ctx, ["CEDENTE", "CESSIONARIO", "ANUENTE", "INTERMEDIARIO"]),
    comTestemunhas: true,
  };
}

// =====================================================================
// NOTIFICAÇÃO DE CESSÃO AO DEVEDOR
// =====================================================================

export function gerarNotificacaoDevedor(ctx: ContextoDocumento): MontagemDocumento {
  const cedente = parte(ctx, "CEDENTE");
  const cessionario = parte(ctx, "CESSIONARIO");

  const destinatario = campo(ctx, "destinatario") || ctx.operacao?.enteDevedor || "[DEVEDOR NÃO INFORMADO]";
  const enderecoDestinatario = campo(ctx, "enderecoDestinatario");
  const dadosPagamento = campo(ctx, "dadosPagamento");

  const corpo = [];

  corpo.push(paragrafo(`À ${destinatario}`, { negrito: true }));
  if (enderecoDestinatario) corpo.push(paragrafo(enderecoDestinatario));
  corpo.push(espaco(200));
  corpo.push(
    paragrafo(`Ref.: Notificação de cessão de crédito — art. 290 do Código Civil`, { negrito: true })
  );
  corpo.push(espaco(200));

  corpo.push(paragrafo("Prezados Senhores,"));

  corpo.push(
    paragrafoRico(
      `${cedente ? qualificar(cedente.pessoa) : "[CEDENTE NÃO INFORMADO]"}, na qualidade de **CEDENTE**, ` +
        "vem, na forma do art. 290 do Código Civil, NOTIFICAR V.Sas. de que cedeu e transferiu, em caráter " +
        "irrevogável, o crédito adiante identificado."
    )
  );

  corpo.push(clausulaTitulo("1. DO CRÉDITO CEDIDO"));
  corpo.push(paragrafo(descreverAtivo(ctx)));
  corpo.push(...quadroDoAtivo(ctx));

  corpo.push(clausulaTitulo("2. DO NOVO CREDOR"));
  corpo.push(
    paragrafoRico(
      cessionario
        ? `${qualificar(cessionario.pessoa)}, na qualidade de **CESSIONÁRIO**, é, a partir desta notificação, o ` +
            "único legítimo credor do valor acima."
        : "[CESSIONÁRIO NÃO INFORMADO]"
    )
  );

  corpo.push(clausulaTitulo("3. DO PAGAMENTO"));
  corpo.push(
    paragrafo(
      "A partir do recebimento desta, todo e qualquer pagamento relativo ao crédito deverá ser efetuado " +
        "exclusivamente ao CESSIONÁRIO, ficando V.Sas. cientes de que o pagamento feito ao CEDENTE após esta " +
        "notificação não produzirá efeito liberatório."
    )
  );
  if (dadosPagamento) {
    corpo.push(paragrafo(`Dados para pagamento: ${dadosPagamento}`));
  }

  corpo.push(clausulaTitulo("4. DA DOCUMENTAÇÃO"));
  corpo.push(
    paragrafo(
      "Segue anexa cópia do instrumento de cessão, para os devidos registros. Colocamo-nos à disposição para " +
        "prestar qualquer esclarecimento e solicitamos a confirmação do recebimento desta notificação."
    )
  );

  corpo.push(espaco(200));
  corpo.push(paragrafo("Atenciosamente,"));

  return {
    titulo: "Notificação de Cessão de Crédito",
    subtitulo: `Emitida em ${dataExtenso(ctx.agora)}`,
    corpo,
    assinantes: assinantesDe(ctx, ["CEDENTE", "CESSIONARIO"]),
    comTestemunhas: false,
  };
}
