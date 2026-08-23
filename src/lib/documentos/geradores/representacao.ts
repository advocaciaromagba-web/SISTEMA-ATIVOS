/** Procuração e mandato de representação comercial. */
import { clausulaTitulo, item, paragrafo, paragrafoRico } from "../base";
import { apelidosUnicos, qualificar, qualificarComApelido } from "../qualificacao";
import { campo, campoNumero, campoSim, descreverAtivo, parte, partesPor, type ContextoDocumento } from "../contexto";
import type { MontagemDocumento } from "../montagem";
import { assinantesDe, clausulaForo, fechamentoEletronico } from "./comum";
import { percentualComExtenso } from "@/lib/formato";

// =====================================================================
// PROCURAÇÃO (ad negotia)
// =====================================================================

export function gerarProcuracao(ctx: ContextoDocumento): MontagemDocumento {
  const outorgante = parte(ctx, "CEDENTE");
  const outorgados = [...partesPor(ctx, "REPRESENTANTE"), ...partesPor(ctx, "INTERMEDIARIO")];

  const prazoMeses = campoNumero(ctx, "prazoMeses", 12) ?? 12;
  const podeSubstabelecer = campoSim(ctx, "substabelecer", true);
  const irrevogavel = campoSim(ctx, "irrevogavel", false);
  const poderesEspecificos = campo(ctx, "poderes");

  const corpo = [];

  corpo.push(clausulaTitulo("OUTORGANTE"));
  corpo.push(
    paragrafoRico(
      outorgante
        ? `${qualificarComApelido(outorgante.pessoa, "Outorgante")}.`
        : "[OUTORGANTE NÃO INFORMADO — cadastre a parte com papel de Cedente]"
    )
  );

  corpo.push(clausulaTitulo("OUTORGADO(S)"));
  if (outorgados.length === 0) {
    corpo.push(paragrafo("[OUTORGADO NÃO INFORMADO — cadastre a parte com papel de Representante ou Intermediário]"));
  }
  for (const o of outorgados) {
    corpo.push(paragrafoRico(`${qualificar(o.pessoa)};`));
  }

  corpo.push(clausulaTitulo("PODERES"));
  corpo.push(
    paragrafo(
      `Pelo presente instrumento particular de procuração, o OUTORGANTE nomeia e constitui seu bastante ` +
        `procurador o(s) OUTORGADO(S) acima qualificado(s), a quem confere poderes para, em seu nome e por sua ` +
        `conta, praticar os atos necessários à negociação, formalização e recebimento relativos a ${descreverAtivo(ctx)}.`
    )
  );

  if (poderesEspecificos) {
    corpo.push(paragrafo(poderesEspecificos));
  } else {
    corpo.push(
      paragrafo(
        "Para tanto, poderá o OUTORGADO: representar o OUTORGANTE perante pessoas físicas e jurídicas de direito " +
          "privado e público, órgãos da administração direta e indireta, autarquias, tribunais, cartórios, juntas " +
          "comerciais, secretarias de fazenda, instituições financeiras e demais repartições; requerer, acompanhar " +
          "e retirar certidões, extratos e documentos; prestar e receber informações; apresentar e receber propostas; " +
          "negociar preço, deságio, prazos e condições; assinar contratos, termos, aditivos, declarações e " +
          "instrumentos de cessão; e praticar todos os demais atos necessários ao fiel cumprimento deste mandato."
      )
    );
    corpo.push(
      paragrafoRico(
        "**Poderes especiais (art. 661, § 1º, do Código Civil):** ficam expressamente conferidos os poderes para " +
          "transigir, firmar compromisso, dar e receber quitação, receber valores e emitir recibo, renunciar a " +
          "direitos e alienar o ativo objeto deste mandato, quando necessários à conclusão do negócio."
      )
    );
  }

  corpo.push(
    paragrafo(
      podeSubstabelecer
        ? "O(s) OUTORGADO(S) poderá(ão) substabelecer os poderes ora conferidos, com reserva de iguais poderes, " +
            "respondendo pelos atos do substabelecido."
        : "É vedado ao OUTORGADO substabelecer os poderes ora conferidos."
    )
  );

  corpo.push(
    paragrafo(
      irrevogavel
        ? "A presente procuração é outorgada em caráter irrevogável e irretratável, na forma do art. 684 do Código " +
            "Civil, por constituir condição do negócio a que se vincula."
        : `A presente procuração vigora por ${prazoMeses} meses contados desta data, podendo ser revogada a qualquer ` +
            "tempo mediante comunicação escrita ao OUTORGADO."
    )
  );

  corpo.push(
    paragrafo(
      "O OUTORGANTE ratifica desde já todos os atos praticados pelo OUTORGADO no exercício regular deste mandato."
    )
  );

  return {
    titulo: "Procuração",
    subtitulo: "Instrumento particular de mandato — arts. 653 e seguintes do Código Civil",
    corpo,
    assinantes: assinantesDe(ctx, ["CEDENTE"]),
    comTestemunhas: false,
  };
}

// =====================================================================
// MANDATO DE REPRESENTAÇÃO COMERCIAL
// =====================================================================

export function gerarMandato(ctx: ContextoDocumento): MontagemDocumento {
  const titular = parte(ctx, "CEDENTE");
  const intermediarios = partesPor(ctx, "INTERMEDIARIO");

  const exclusivo = campoSim(ctx, "exclusividade", true);
  const prazoMeses = campoNumero(ctx, "prazoMeses", 6) ?? 6;
  const comissao = campoNumero(ctx, "comissaoPercentual");
  const despesasDoIntermediario = campo(ctx, "despesas", "intermediario") === "intermediario";

  const corpo = [];

  corpo.push(clausulaTitulo("PARTES"));
  if (titular) corpo.push(paragrafoRico(`${qualificarComApelido(titular.pessoa, "Mandante")};`));
  const apelidosMandatarios = apelidosUnicos("Mandatário", intermediarios.length);
  intermediarios.forEach((i, indice) => {
    corpo.push(paragrafoRico(`${qualificarComApelido(i.pessoa, apelidosMandatarios[indice])};`));
  });

  corpo.push(
    paragrafo(
      "As PARTES celebram o presente Contrato de Mandato e Representação Comercial, regido pelos arts. 653 a 692 " +
        "e 722 a 729 do Código Civil, mediante as cláusulas seguintes."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA PRIMEIRA — DO OBJETO"));
  corpo.push(
    item(
      "1.1.",
      `O MANDANTE contrata o MANDATÁRIO para representá-lo na busca de interessados e na negociação relativa a ${descreverAtivo(ctx)}.`
    )
  );
  corpo.push(
    item(
      "1.2.",
      exclusivo
        ? "A representação é conferida com EXCLUSIVIDADE. Durante a vigência deste contrato, o MANDANTE não " +
            "negociará o ativo por si ou por terceiros, sendo devida a remuneração ao MANDATÁRIO ainda que o " +
            "negócio se conclua sem a sua intervenção direta, na forma do art. 726 do Código Civil."
        : "A representação é conferida SEM exclusividade, podendo o MANDANTE contratar outros representantes ou " +
            "negociar diretamente, hipótese em que a remuneração será devida apenas ao representante que houver " +
            "efetivamente aproximado as partes."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA SEGUNDA — DAS OBRIGAÇÕES DO MANDATÁRIO"));
  corpo.push(
    item(
      "2.1.",
      "Compete ao MANDATÁRIO: (a) prospectar e qualificar interessados; (b) apresentar a oportunidade com " +
        "informações verdadeiras e completas; (c) conduzir as tratativas com diligência e lealdade; (d) prestar " +
        "contas ao MANDANTE sempre que solicitado; (e) manter sigilo sobre as informações recebidas; e (f) não " +
        "assumir obrigações em nome do MANDANTE além dos poderes conferidos."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA TERCEIRA — DAS OBRIGAÇÕES DO MANDANTE"));
  corpo.push(
    item(
      "3.1.",
      "Compete ao MANDANTE: (a) fornecer a documentação completa e verdadeira do ativo; (b) comunicar " +
        "imediatamente qualquer fato que altere a titularidade, o valor ou a exigibilidade do ativo; (c) não " +
        "praticar atos que impeçam a conclusão do negócio; e (d) pagar a remuneração ajustada."
    )
  );
  corpo.push(
    item(
      "3.2.",
      "O MANDANTE declara ser o legítimo titular do ativo e que este não se encontra penhorado, cedido, " +
        "caucionado ou gravado, respondendo pela veracidade desta declaração."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA QUARTA — DA REMUNERAÇÃO"));
  corpo.push(
    item(
      "4.1.",
      comissao != null
        ? `A título de remuneração, o MANDATÁRIO fará jus a ${percentualComExtenso(comissao)} sobre o valor bruto ` +
            "do negócio efetivamente concluído."
        : "A remuneração do MANDATÁRIO será a ajustada entre as PARTES sobre o valor bruto do negócio concluído."
    )
  );
  corpo.push(
    item(
      "4.2.",
      "A remuneração é devida quando o resultado previsto for alcançado, ainda que o negócio se conclua após o " +
        "término deste contrato, desde que decorrente da aproximação realizada pelo MANDATÁRIO, na forma do art. " +
        "725 do Código Civil."
    )
  );
  corpo.push(
    item(
      "4.3.",
      despesasDoIntermediario
        ? "As despesas da representação correm por conta do MANDATÁRIO, salvo as expressamente autorizadas por " +
            "escrito pelo MANDANTE."
        : "As despesas necessárias à representação, previamente aprovadas, serão reembolsadas pelo MANDANTE em até " +
            "10 (dez) dias da apresentação dos comprovantes."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA QUINTA — DO PRAZO"));
  corpo.push(
    item(
      "5.1.",
      `O presente contrato vigora por ${prazoMeses} meses contados da assinatura, renovando-se por igual período ` +
        "se nenhuma das PARTES manifestar o contrário com 15 (quinze) dias de antecedência."
    )
  );
  corpo.push(
    item(
      "5.2.",
      "A revogação do mandato antes do prazo, sem justa causa, não afasta a remuneração relativa aos negócios já " +
        "encaminhados pelo MANDATÁRIO que venham a se concluir nos 12 (doze) meses seguintes."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA SEXTA — DA CONFIDENCIALIDADE E DA NÃO CIRCUNVENÇÃO"));
  corpo.push(
    item(
      "6.1.",
      "As PARTES obrigam-se ao sigilo sobre as informações trocadas e a não contornar a outra na relação com os " +
        "contatos apresentados, sob pena da multa prevista na cláusula seguinte."
    )
  );

  corpo.push(clausulaTitulo("CLÁUSULA SÉTIMA — DA MULTA"));
  corpo.push(
    item(
      "7.1.",
      "O descumprimento de qualquer obrigação sujeita a PARTE infratora a multa de 10% (dez por cento) do valor do " +
        "negócio, sem prejuízo das perdas e danos e da remuneração devida."
    )
  );

  corpo.push(...clausulaForo(ctx, "CLÁUSULA OITAVA"));
  corpo.push(fechamentoEletronico(true));

  return {
    titulo: "Contrato de Mandato e Representação Comercial",
    corpo,
    assinantes: assinantesDe(ctx, ["CEDENTE", "INTERMEDIARIO"]),
    comTestemunhas: true,
  };
}
