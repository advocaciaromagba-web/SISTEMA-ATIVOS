/** Comissionamento, quitação, aditivo e distrato. */
import { clausulaTitulo, espaco, item, paragrafo, paragrafoRico, tabela } from "../base";
import { apelidosUnicos, identificacao, nomeCurto, qualificarComApelido } from "../qualificacao";
import {
  campo,
  campoNumero,
  descreverAtivo,
  parte,
  partesPor,
  valorReferencia,
  type ContextoDocumento,
} from "../contexto";
import type { MontagemDocumento } from "../montagem";
import { assinantesDe, clausulaForo, contadorClausulas, fechamentoEletronico } from "./comum";
import { moeda, moedaComExtenso, percentualComExtenso, dataCurta } from "@/lib/formato";

// =====================================================================
// TERMO DE COMISSIONAMENTO
// =====================================================================

export function gerarTermoComissao(ctx: ContextoDocumento): MontagemDocumento {
  const intermediarios = partesPor(ctx, "INTERMEDIARIO");
  const pagador = parte(ctx, "CESSIONARIO") ?? parte(ctx, "CEDENTE");

  const gatilho = campo(ctx, "gatilho", "liquidacao");
  const prazoDias = campoNumero(ctx, "prazoPagamentoDias", 5) ?? 5;
  const rateio = campo(ctx, "rateio");
  const referencia = valorReferencia(ctx);
  const moedaOp = ((ctx.operacao?.moeda ?? "BRL") as "BRL" | "USD" | "EUR");

  const c = contadorClausulas();
  const corpo = [];

  corpo.push(clausulaTitulo("PARTES"));
  if (pagador) corpo.push(paragrafoRico(`${qualificarComApelido(pagador.pessoa, "Devedor da Comissão")};`));
  const apelidosComissionados = apelidosUnicos("Comissionado", intermediarios.length);
  intermediarios.forEach((i, indice) => {
    corpo.push(paragrafoRico(`${qualificarComApelido(i.pessoa, apelidosComissionados[indice])};`));
  });

  const cObjeto = c.proxima("DO OBJETO");
  corpo.push(clausulaTitulo(cObjeto.cabecalho));
  corpo.push(
    item(
      `${cObjeto.prefixo}1.`,
      `O presente termo regula a remuneração devida aos COMISSIONADOS pela intermediação da operação relativa a ${descreverAtivo(ctx)}.`
    )
  );

  const cValor = c.proxima("DA COMISSÃO E DO RATEIO");
  corpo.push(clausulaTitulo(cValor.cabecalho));

  // Rateio: soma o que está cadastrado em cada parte e confere o total.
  const somaPercentual = intermediarios.reduce(
    (total, i) => total + (i.comissaoPercentual != null ? Number(i.comissaoPercentual) : 0),
    0
  );

  if (rateio) {
    corpo.push(item(`${cValor.prefixo}1.`, rateio));
  } else if (intermediarios.length > 0 && somaPercentual > 0) {
    corpo.push(
      item(
        `${cValor.prefixo}1.`,
        `A comissão total de ${percentualComExtenso(somaPercentual)} sobre o valor da operação será rateada na ` +
          "forma do quadro abaixo:"
      )
    );
    corpo.push(
      tabela(
        ["Comissionado", "Documento", "Percentual", "Valor estimado"],
        intermediarios.map((i) => {
          const pct = i.comissaoPercentual != null ? Number(i.comissaoPercentual) : 0;
          return [
            nomeCurto(i.pessoa),
            identificacao(i.pessoa).replace(/^(CPF|CNPJ) /, ""),
            pct > 0 ? `${pct}%` : "a definir",
            referencia != null && pct > 0 ? moeda(referencia * (pct / 100), moedaOp) : "—",
          ];
        })
      )
    );
    corpo.push(espaco(200));
    if (referencia != null) {
      corpo.push(
        item(
          `${cValor.prefixo}2.`,
          `Sobre o valor de referência de ${moedaComExtenso(referencia, moedaOp)}, a comissão total corresponde a ` +
            `${moedaComExtenso(referencia * (somaPercentual / 100), moedaOp)}.`
        )
      );
    }
  } else {
    corpo.push(
      item(
        `${cValor.prefixo}1.`,
        "[PERCENTUAL DE COMISSÃO NÃO INFORMADO — cadastre a participação de cada intermediário na operação]"
      )
    );
  }

  const cPagamento = c.proxima("DO PAGAMENTO");
  corpo.push(clausulaTitulo(cPagamento.cabecalho));
  const textoGatilho = {
    assinatura: "na data da assinatura do contrato definitivo da operação",
    liquidacao: "na data da liquidação financeira da operação",
    proporcional: "proporcionalmente a cada parcela efetivamente recebida pelo DEVEDOR DA COMISSÃO",
  }[gatilho] ?? "na data da liquidação financeira da operação";

  corpo.push(
    item(
      `${cPagamento.prefixo}1.`,
      `A comissão torna-se devida ${textoGatilho}, e será paga em até ${prazoDias} (${prazoDias}) dias úteis ` +
        "contados desse evento, mediante transferência bancária para as contas indicadas por cada COMISSIONADO."
    )
  );
  corpo.push(
    item(
      `${cPagamento.prefixo}2.`,
      "A comissão é devida ainda que o negócio venha a se concluir após o término da intermediação, desde que " +
        "decorrente da aproximação realizada pelos COMISSIONADOS, na forma do art. 725 do Código Civil."
    )
  );
  corpo.push(
    item(
      `${cPagamento.prefixo}3.`,
      "Cada COMISSIONADO responde individualmente pelos tributos incidentes sobre a sua parcela, emitindo o " +
        "documento fiscal correspondente quando obrigado."
    )
  );

  const cMora = c.proxima("DA MORA E DA GARANTIA");
  corpo.push(clausulaTitulo(cMora.cabecalho));
  corpo.push(
    item(
      `${cMora.prefixo}1.`,
      "O atraso sujeita o DEVEDOR DA COMISSÃO a multa de 2% (dois por cento), juros de 1% (um por cento) ao mês e " +
        "correção monetária."
    )
  );
  corpo.push(
    item(
      `${cMora.prefixo}2.`,
      "Este termo constitui título executivo extrajudicial, nos termos do art. 784, III, do Código de Processo Civil."
    )
  );

  corpo.push(...clausulaForo(ctx, c.proxima("DO FORO").cabecalho));
  corpo.push(fechamentoEletronico(true));

  return {
    titulo: "Termo de Comissionamento",
    corpo,
    assinantes: assinantesDe(ctx, ["CESSIONARIO", "CEDENTE", "INTERMEDIARIO"]),
    comTestemunhas: true,
  };
}

// =====================================================================
// TERMO DE QUITAÇÃO
// =====================================================================

export function gerarTermoQuitacao(ctx: ContextoDocumento): MontagemDocumento {
  const cedente = parte(ctx, "CEDENTE");
  const cessionario = parte(ctx, "CESSIONARIO");

  const valorRecebido = campoNumero(ctx, "valorRecebido");
  const dataRecebimento = campo(ctx, "dataRecebimento");
  const ressalvas = campo(ctx, "ressalvas");
  const moedaOp = ((ctx.operacao?.moeda ?? "BRL") as "BRL" | "USD" | "EUR");

  const corpo = [];

  corpo.push(clausulaTitulo("PARTES"));
  if (cedente) corpo.push(paragrafoRico(`${qualificarComApelido(cedente.pessoa, "Credor")};`));
  if (cessionario) corpo.push(paragrafoRico(`${qualificarComApelido(cessionario.pessoa, "Devedor")};`));

  corpo.push(
    paragrafo(
      `O CREDOR declara haver recebido do DEVEDOR, relativamente à operação de ${descreverAtivo(ctx)}, ` +
        (valorRecebido != null
          ? `a importância de ${moedaComExtenso(valorRecebido, moedaOp)}`
          : "a integralidade dos valores ajustados") +
        (dataRecebimento ? `, em ${dataRecebimento}` : "") +
        "."
    )
  );

  corpo.push(
    paragrafo(
      ressalvas
        ? `Dá, por este instrumento, quitação quanto aos valores acima, ressalvado o seguinte: ${ressalvas}`
        : "Dá, por este instrumento e na melhor forma de direito, PLENA, GERAL, RASA e IRREVOGÁVEL QUITAÇÃO, para " +
            "nada mais reclamar, a qualquer tempo e a qualquer título, em juízo ou fora dele, relativamente à " +
            "operação ora encerrada."
    )
  );

  corpo.push(
    paragrafo(
      "As PARTES declaram que não subsiste entre si qualquer pendência, obrigação ou litígio decorrente da " +
        "operação, dando-a por integralmente cumprida, nos termos dos arts. 319 a 324 do Código Civil."
    )
  );

  return {
    titulo: "Termo de Quitação",
    corpo,
    assinantes: assinantesDe(ctx, ["CEDENTE", "CESSIONARIO", "INTERMEDIARIO"]),
    comTestemunhas: true,
  };
}

// =====================================================================
// ADITIVO E DISTRATO
// =====================================================================

export function gerarAditivo(ctx: ContextoDocumento): MontagemDocumento {
  const cedente = parte(ctx, "CEDENTE");
  const cessionario = parte(ctx, "CESSIONARIO");

  const contratoOriginal = campo(ctx, "contratoOriginal");
  const dataOriginal = campo(ctx, "dataOriginal");
  const alteracoes = campo(ctx, "alteracoes");

  const c = contadorClausulas();
  const corpo = [];

  corpo.push(clausulaTitulo("PARTES"));
  if (cedente) corpo.push(paragrafoRico(`${qualificarComApelido(cedente.pessoa, "Cedente")};`));
  if (cessionario) corpo.push(paragrafoRico(`${qualificarComApelido(cessionario.pessoa, "Cessionário")};`));

  const cRef = c.proxima("DO CONTRATO ADITADO");
  corpo.push(clausulaTitulo(cRef.cabecalho));
  corpo.push(
    item(
      `${cRef.prefixo}1.`,
      `As PARTES celebraram ${contratoOriginal || "[CONTRATO NÃO IDENTIFICADO]"}` +
        (dataOriginal ? `, firmado em ${dataOriginal}` : "") +
        `, referente a ${descreverAtivo(ctx)}, que por este instrumento resolvem aditar.`
    )
  );

  const cAlt = c.proxima("DAS ALTERAÇÕES");
  corpo.push(clausulaTitulo(cAlt.cabecalho));
  corpo.push(item(`${cAlt.prefixo}1.`, alteracoes || "[ALTERAÇÕES NÃO INFORMADAS]"));

  const cRat = c.proxima("DA RATIFICAÇÃO");
  corpo.push(clausulaTitulo(cRat.cabecalho));
  corpo.push(
    item(
      `${cRat.prefixo}1.`,
      "Permanecem inalteradas e em pleno vigor todas as demais cláusulas e condições do contrato original, que as " +
        "PARTES expressamente ratificam."
    )
  );

  corpo.push(...clausulaForo(ctx, c.proxima("DO FORO").cabecalho));
  corpo.push(fechamentoEletronico(true));

  return {
    titulo: "Termo Aditivo",
    corpo,
    assinantes: assinantesDe(ctx, ["CEDENTE", "CESSIONARIO", "INTERMEDIARIO"]),
    comTestemunhas: true,
  };
}

export function gerarDistrato(ctx: ContextoDocumento): MontagemDocumento {
  const cedente = parte(ctx, "CEDENTE");
  const cessionario = parte(ctx, "CESSIONARIO");

  const contratoOriginal = campo(ctx, "contratoOriginal");
  const dataOriginal = campo(ctx, "dataOriginal");
  const acertos = campo(ctx, "acertos");

  const c = contadorClausulas();
  const corpo = [];

  corpo.push(clausulaTitulo("PARTES"));
  if (cedente) corpo.push(paragrafoRico(`${qualificarComApelido(cedente.pessoa, "Cedente")};`));
  if (cessionario) corpo.push(paragrafoRico(`${qualificarComApelido(cessionario.pessoa, "Cessionário")};`));

  const cRef = c.proxima("DO CONTRATO DESFEITO");
  corpo.push(clausulaTitulo(cRef.cabecalho));
  corpo.push(
    item(
      `${cRef.prefixo}1.`,
      `As PARTES celebraram ${contratoOriginal || "[CONTRATO NÃO IDENTIFICADO]"}` +
        (dataOriginal ? `, firmado em ${dataOriginal}` : "") +
        ", que por este instrumento resolvem distratar de comum acordo, na forma do art. 472 do Código Civil."
    )
  );

  const cEfeito = c.proxima("DOS EFEITOS");
  corpo.push(clausulaTitulo(cEfeito.cabecalho));
  corpo.push(
    item(
      `${cEfeito.prefixo}1.`,
      "O contrato fica rescindido a partir desta data, cessando todos os direitos e obrigações dele decorrentes, " +
        "e retornando as PARTES ao estado anterior à contratação."
    )
  );
  corpo.push(item(`${cEfeito.prefixo}2.`, acertos || "[DEVOLUÇÕES E ACERTOS NÃO INFORMADOS]"));

  const cQuit = c.proxima("DA QUITAÇÃO RECÍPROCA");
  corpo.push(clausulaTitulo(cQuit.cabecalho));
  corpo.push(
    item(
      `${cQuit.prefixo}1.`,
      "Cumpridos os acertos acima, as PARTES dão-se mútua, plena, geral e irrevogável quitação quanto ao contrato " +
        "distratado, nada mais tendo a reclamar uma da outra a qualquer título."
    )
  );

  corpo.push(...clausulaForo(ctx, c.proxima("DO FORO").cabecalho));
  corpo.push(fechamentoEletronico(true));

  return {
    titulo: "Instrumento de Distrato",
    corpo,
    assinantes: assinantesDe(ctx, ["CEDENTE", "CESSIONARIO", "INTERMEDIARIO"]),
    comTestemunhas: true,
  };
}
