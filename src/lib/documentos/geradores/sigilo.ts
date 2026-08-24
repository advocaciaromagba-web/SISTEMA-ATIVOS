/**
 * Documentos que protegem a informação e a posição do intermediário:
 * NDA, NCNDA e IMFPA.
 */
import { clausulaTitulo, item, paragrafo, paragrafoRico, tabela } from "../base";
import { apelidosUnicos, identificacao, nomeCurto, qualificarComApelido } from "../qualificacao";
import {
  assinantesDe,
  clausulaForo,
  contadorClausulas,
  fechamentoEletronico,
  listar,
  minuscula,
  ordinalClausula,
} from "./comum";
import {
  campo,
  campoNumero,
  campoSim,
  descreverAtivo,
  descreverValores,
  foro,
  parte,
  partesPor,
  valorReferencia,
  type ContextoDocumento,
} from "../contexto";
import type { MontagemDocumento } from "../montagem";
import { inteiroPorExtenso, moedaComExtenso, numero, percentualComExtenso, moeda } from "@/lib/formato";
import { perfilDoAtivo } from "@/lib/ativos/perfis";

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

/**
 * Monta o NCNDA a partir do perfil do ativo.
 *
 * Não existe NCNDA de precatório e mais nada: o mesmo instrumento protege
 * venda de ouro, embarque de commodity, cessão de crédito federal e negócio
 * imobiliário. O que muda em cada um é o objeto, o que o transmitente
 * garante, o que ele expressamente NÃO garante, e a documentação sem a qual
 * a operação não anda. Tudo isso vem de `perfilDoAtivo` — este gerador não
 * carrega regra de ativo por dentro.
 *
 * A estrutura segue a prática de mercado: parte divulgadora e parte
 * receptora, cadeia de intermediação nomeada, devolução e destruição das
 * informações, remuneração protegida e multa que sobrevive ao término.
 */
export function gerarNCNDA(ctx: ContextoDocumento): MontagemDocumento {
  const perfil = perfilDoAtivo(ctx.operacao?.tipoAtivo);
  const compraEVenda = perfil.natureza === "COMPRA_VENDA";

  const divulgadores = [...partesPor(ctx, "DIVULGADOR"), ...partesPor(ctx, "MANDATARIO_VENDA")];
  const receptores = [...partesPor(ctx, "RECEPTOR"), ...partesPor(ctx, "MANDATARIO_COMPRA")];
  const intermediarios = partesPor(ctx, "INTERMEDIARIO");
  const cedente = parte(ctx, "CEDENTE");
  const cessionario = parte(ctx, "CESSIONARIO");

  const prazoMeses = campoNumero(ctx, "prazoMeses", 24) ?? 24;
  const prazoSigiloAnos = campoNumero(ctx, "prazoSigiloAnos", 5) ?? 5;
  const prazoPosVigenciaMeses = campoNumero(ctx, "prazoNaoCircunvencaoMeses", 36) ?? 36;
  const comissao = campoNumero(ctx, "comissaoPercentual");
  const multaPct = campoNumero(ctx, "multaPercentual", 30) ?? 30;
  const multaPiso = campoNumero(ctx, "multaPiso");
  const futuras = campoSim(ctx, "transacoesFuturas", true);
  const referencia = valorReferencia(ctx);

  const corpo = [];
  const c = contadorClausulas();

  // ----- partes, no vocabulário que o mercado usa -----

  corpo.push(clausulaTitulo("DAS PARTES"));

  if (divulgadores.length > 0) {
    corpo.push(paragrafo("PARTE DIVULGADORA", { negrito: true }));
    const apelidos = apelidosUnicos("Parte Divulgadora", divulgadores.length);
    divulgadores.forEach((p, i) => corpo.push(paragrafoRico(`${qualificarComApelido(p.pessoa, apelidos[i])};`)));
  }

  if (intermediarios.length > 0) {
    corpo.push(paragrafo("PARTE INTERMEDIÁRIA", { negrito: true }));
    const apelidos = apelidosUnicos("Intermediário", intermediarios.length);
    intermediarios.forEach((p, i) => corpo.push(paragrafoRico(`${qualificarComApelido(p.pessoa, apelidos[i])};`)));
  }

  if (receptores.length > 0) {
    corpo.push(paragrafo("PARTE RECEPTORA", { negrito: true }));
    const apelidos = apelidosUnicos("Parte Receptora", receptores.length);
    receptores.forEach((p, i) => corpo.push(paragrafoRico(`${qualificarComApelido(p.pessoa, apelidos[i])};`)));
  }

  // Cedente e cessionário aparecem quando já identificados; em muitas
  // operações eles só entram depois, e o NCNDA é assinado antes disso.
  const titulares = [cedente, cessionario].filter(Boolean) as NonNullable<typeof cedente>[];
  if (titulares.length > 0) {
    corpo.push(paragrafo(compraEVenda ? "VENDEDOR E COMPRADOR" : "CEDENTE E CESSIONÁRIO", { negrito: true }));
    const rotulos = [perfil.vocabulario.transmitente, perfil.vocabulario.adquirente];
    const presentes = [cedente, cessionario]
      .map((p, i) => (p ? { p, rotulo: rotulos[i] } : null))
      .filter(Boolean) as { p: NonNullable<typeof cedente>; rotulo: string }[];
    presentes.forEach(({ p, rotulo }) => corpo.push(paragrafoRico(`${qualificarComApelido(p.pessoa, rotulo)};`)));
  }

  if (divulgadores.length === 0 && intermediarios.length === 0) {
    corpo.push(
      paragrafo(
        "[CADASTRE AS PARTES DA OPERAÇÃO: o NCNDA só protege quem ele nomeia. Sem a parte divulgadora e a cadeia " +
          "de intermediação identificadas, o instrumento não cumpre a função para a qual existe.]"
      )
    );
  }

  corpo.push(
    paragrafo(
      "As PARTES celebram o presente Acordo de Não Circunvenção e Confidencialidade (Non-Circumvention, " +
        `Non-Disclosure Agreement — NCNDA), destinado à ${perfil.objeto}, regido pelas cláusulas a seguir e, no ` +
        `que couber, por ${listar(perfil.fundamentos)}, bem como pelos arts. 422, 425 e 722 a 729 do Código Civil.`
    )
  );

  // ----- objeto -----

  const cObjeto = c.proxima("DO OBJETO E DA APRESENTAÇÃO");
  corpo.push(clausulaTitulo(cObjeto.cabecalho));
  corpo.push(
    item(
      cObjeto.item(),
      `O presente instrumento tem por objeto a intermediação, a estruturação e o comissionamento decorrentes da ` +
        `${perfil.objeto}, relativa a ${descreverAtivo(ctx)}.`
    )
  );

  const valores = descreverValores(ctx);
  if (valores) {
    corpo.push(
      item(
        cObjeto.item(),
        `A operação apresenta ${valores}, sendo que a forma e o prazo de pagamento serão estruturados em ` +
          "instrumento próprio, a ser celebrado após a conclusão da diligência."
      )
    );
  }

  corpo.push(
    item(
      cObjeto.item(),
      "As PARTES reconhecem que não conheciam previamente as contrapartes, fontes e oportunidades ora " +
        "apresentadas, e que delas tomaram conhecimento exclusivamente por intermédio da PARTE DIVULGADORA e da " +
        "cadeia de intermediação nomeada neste instrumento."
    )
  );

  // ----- confidencialidade -----

  const cSigilo = c.proxima("DAS INFORMAÇÕES CONFIDENCIAIS");
  corpo.push(clausulaTitulo(cSigilo.cabecalho));
  corpo.push(
    item(
      cSigilo.item(),
      "Consideram-se Informações Confidenciais todos os documentos, dados, relatórios, pareceres, laudos, " +
        "certidões, apresentações, processos judiciais e administrativos, estratégias comerciais, fiscais e " +
        "financeiras, identidade de investidores, compradores, vendedores, mandatários e intermediários, " +
        "estruturas operacionais, valores, deságios, comissões, dados bancários e contatos revelados, direta ou " +
        "indiretamente, em razão deste acordo."
    )
  );
  corpo.push(
    item(
      cSigilo.item(),
      "As Informações Confidenciais serão utilizadas exclusivamente para a análise da operação objeto deste " +
        "instrumento, vedada qualquer outra finalidade."
    )
  );
  corpo.push(
    item(
      cSigilo.item(),
      "Nenhuma Informação Confidencial poderá ser compartilhada, reproduzida, divulgada ou disponibilizada a " +
        "terceiros sem autorização prévia, expressa e escrita da PARTE DIVULGADORA, que indicará especificamente " +
        "os destinatários autorizados."
    )
  );
  corpo.push(
    item(
      cSigilo.item(),
      "Autorizada a divulgação, a PARTE RECEPTORA responde integralmente pelos atos dos terceiros que receberem " +
        "as informações, de forma solidária."
    )
  );
  corpo.push(
    item(
      cSigilo.item(),
      `A obrigação de sigilo vigora durante este acordo e por ${prazoSigiloAnos} (${inteiroPorExtenso(prazoSigiloAnos)}) ` +
        "anos após sua extinção, qualquer que seja o motivo, observada a Lei nº 13.709/2018 quanto a dados pessoais."
    )
  );
  corpo.push(
    item(
      cSigilo.item(),
      "Não são confidenciais as informações que já eram de domínio público, que se tornaram públicas sem " +
        "violação deste acordo, que a parte já detinha comprovadamente antes da revelação, ou cuja divulgação " +
        "seja exigida por lei, ordem judicial ou autoridade competente, hipótese em que a parte requerida " +
        "comunicará previamente a PARTE DIVULGADORA."
    )
  );

  // ----- devolução e destruição -----

  const cDevolucao = c.proxima("DA DEVOLUÇÃO E DA DESTRUIÇÃO DAS INFORMAÇÕES");
  corpo.push(clausulaTitulo(cDevolucao.cabecalho));
  corpo.push(
    item(
      cDevolucao.item(),
      "Encerradas as tratativas, concluída ou não a operação, a PARTE RECEPTORA deverá, em até 10 (dez) dias " +
        "úteis contados da comunicação: I – devolver toda a documentação física recebida; II – destruir os " +
        "arquivos eletrônicos, cópias, reproduções, anotações e materiais derivados; III – apresentar declaração " +
        "formal de destruição, quando solicitada."
    )
  );
  corpo.push(
    item(
      cDevolucao.item(),
      "A retenção de qualquer documento após esse prazo caracteriza infração contratual grave."
    )
  );

  // ----- documentação e garantias: aqui o ativo manda -----

  const cDiligencia = c.proxima(
    compraEVenda ? "DA DOCUMENTAÇÃO E DA VERIFICAÇÃO DO ATIVO" : "DA DOCUMENTAÇÃO E DA VALIDAÇÃO DO CRÉDITO"
  );
  corpo.push(clausulaTitulo(cDiligencia.cabecalho));
  corpo.push(
    item(
      cDiligencia.item(),
      "A PARTE RECEPTORA terá acesso, sob sigilo, à documentação do ativo, para aferição própria de sua " +
        "existência, regularidade e integralidade, declarando possuir capacidade técnica e autonomia para " +
        "realizar sua avaliação jurídica, contábil, fiscal e operacional, e assumindo integral responsabilidade " +
        "pela decisão de aquisição."
    )
  );
  corpo.push(
    item(
      cDiligencia.item(),
      `A documentação mínima da operação compreende: ${listar(perfil.documentacao)}.`
    )
  );
  corpo.push(
    item(
      cDiligencia.item(),
      `${perfil.vocabulario.transmitente} e PARTE DIVULGADORA garantem: ${listar(perfil.garante)}.`
    )
  );
  corpo.push(
    item(
      cDiligencia.item(),
      `${perfil.vocabulario.transmitente} e PARTE DIVULGADORA NÃO garantem, permanecendo sob exclusiva ` +
        `responsabilidade da PARTE RECEPTORA: ${listar(perfil.naoGarante)}.`
    )
  );
  corpo.push(
    item(
      cDiligencia.item(),
      `As PARTES declaram ciência expressa de que ${minuscula(perfil.riscoCentral)}`
    )
  );
  corpo.push(
    item(
      cDiligencia.item(),
      "Assumidas em instrumento próprio obrigações de habilitação, homologação, compensação, liquidação, " +
        "entrega, transporte ou operacionalização do ativo, permanecem íntegras as garantias ali prestadas, " +
        "obrigando-se o responsável pela estruturação a executá-las na forma da legislação aplicável."
    )
  );

  // ----- não circunvenção -----

  const cCircunvencao = c.proxima("DA NÃO CIRCUNVENÇÃO E DA PRESERVAÇÃO DA CADEIA");
  corpo.push(clausulaTitulo(cCircunvencao.cabecalho));
  corpo.push(
    item(
      cCircunvencao.item(),
      "As oportunidades, os relacionamentos comerciais, os investidores, compradores, vendedores, mandatários e " +
        "demais contatos apresentados constituem patrimônio comercial protegido das PARTES que os apresentaram."
    )
  );
  corpo.push(
    item(
      cCircunvencao.item(),
      `Durante a vigência deste instrumento e por ${prazoPosVigenciaMeses} (${inteiroPorExtenso(prazoPosVigenciaMeses)}) ` +
        "meses após sua extinção, nenhuma das PARTES contatará, negociará, contratará, estruturará, intermediará " +
        "ou concluirá operação, direta ou indireta, com qualquer pessoa apresentada em razão deste acordo, sem " +
        "autorização prévia e escrita de quem a apresentou."
    )
  );
  corpo.push(
    item(
      cCircunvencao.item(),
      "A vedação alcança a atuação por interposta pessoa, empresa coligada, controlada, controladora, sócios, " +
        "procuradores, representantes ou parente até o terceiro grau."
    )
  );
  corpo.push(
    item(
      cCircunvencao.item(),
      "Configura circunvenção, para todos os efeitos, a tentativa de contornar qualquer elo da cadeia mediante " +
        "alteração do desenho da operação, troca de veículo societário, interposição de terceiros ou " +
        "fracionamento do negócio."
    )
  );
  corpo.push(
    item(
      cCircunvencao.item(),
      futuras
        ? "A obrigação alcança não apenas a operação ora apresentada, mas também qualquer operação futura, " +
            "renovação, aditamento, substituição ou desdobramento celebrado entre as mesmas PARTES ou entre elas e " +
            "as contrapartes apresentadas."
        : "A obrigação restringe-se à operação ora apresentada e às suas renovações e aditamentos diretos."
    )
  );

  // ----- remuneração e cadeia -----

  const cRemuneracao = c.proxima("DA REMUNERAÇÃO E DA CADEIA DE COMISSIONAMENTO");
  corpo.push(clausulaTitulo(cRemuneracao.cabecalho));
  corpo.push(
    item(
      cRemuneracao.item(),
      comissao != null
        ? `Fica reconhecida em favor da cadeia de intermediação a remuneração de ${percentualComExtenso(comissao)}, ` +
            "calculada sobre o valor bruto de cada operação efetivamente concluída em decorrência da apresentação " +
            "aqui reconhecida."
        : "Fica reconhecida em favor da cadeia de intermediação a remuneração ajustada em instrumento próprio, " +
            "calculada sobre o valor bruto de cada operação concluída em decorrência da apresentação aqui reconhecida."
    )
  );
  corpo.push(
    item(
      cRemuneracao.item(),
      "A remuneração é devida ainda que a conclusão do negócio ocorra após o término deste acordo, na forma do " +
        "art. 725 do Código Civil, e vincula-se ao efetivo recebimento dos valores pelo adquirente."
    )
  );

  if (intermediarios.length > 0) {
    corpo.push(
      item(cRemuneracao.item(), "A cadeia de intermediação reconhecida pelas PARTES é a constante do quadro abaixo:")
    );
    corpo.push(
      tabela(
        ["Ordem", "Intermediário", "Documento", "Participação"],
        intermediarios.map((i, indice) => [
          String(i.ordemCadeia ?? indice + 1),
          nomeCurto(i.pessoa),
          identificacao(i.pessoa).replace(/^(CPF|CNPJ) /, ""),
          i.comissaoPercentual != null ? `${numero(Number(i.comissaoPercentual), 2)}%` : "conforme instrumento próprio",
        ])
      )
    );
    corpo.push(paragrafo(""));
  }

  corpo.push(
    item(
      cRemuneracao.item(),
      "Remunerações devidas a agentes não nomeados neste instrumento serão tratadas entre as respectivas partes, " +
        "sem que este acordo lhes faça referência ou gere obrigação."
    )
  );

  // ----- vigência -----

  const cVigencia = c.proxima("DA VIGÊNCIA E DA RESCISÃO");
  corpo.push(clausulaTitulo(cVigencia.cabecalho));
  corpo.push(
    item(
      cVigencia.item(),
      `Este acordo vigora por ${prazoMeses} (${inteiroPorExtenso(prazoMeses)}) meses contados da assinatura, ` +
        "renovando-se automaticamente por igual período caso nenhuma das PARTES manifeste o contrário com 30 " +
        "(trinta) dias de antecedência."
    )
  );
  corpo.push(
    item(
      cVigencia.item(),
      "Poderá ser rescindido por acordo escrito entre as PARTES, por descumprimento não sanado em 15 (quinze) " +
        "dias contados de notificação, ou por fato superveniente comprovado que impeça a continuidade da operação."
    )
  );
  corpo.push(
    item(
      cVigencia.item(),
      "A extinção não afeta as obrigações de sigilo, de não circunvenção e de pagamento da remuneração já devida."
    )
  );

  // ----- multas -----

  const cMulta = c.proxima("DAS PENALIDADES");
  corpo.push(clausulaTitulo(cMulta.cabecalho));
  const calculada = referencia != null ? referencia * (multaPct / 100) : null;
  // Com piso, o valor devido é o maior dos dois. Escrever "corresponde a
  // R$ 180.000, não inferior a R$ 200.000" na mesma frase é contradição — e
  // cláusula de multa contraditória é cláusula que se discute em juízo.
  const devida = calculada != null && multaPiso != null ? Math.max(calculada, multaPiso) : calculada;
  corpo.push(
    item(
      cMulta.item(),
      `A quebra de confidencialidade sujeita a PARTE infratora a multa não compensatória de ` +
        `${percentualComExtenso(multaPct)} do valor econômico da operação` +
        (multaPiso != null ? `, observado o piso de ${moeda(multaPiso)}` : "") +
        (devida != null ? `, o que corresponde, nesta data, a ${moeda(devida)}` : "") +
        ", exigível independentemente da comprovação de prejuízo e sem prejuízo de perdas e danos."
    )
  );
  corpo.push(
    item(
      cMulta.item(),
      "A circunvenção sujeita a PARTE infratora a multa compensatória equivalente ao maior dos seguintes valores: " +
        "I – a integralidade da comissão prevista para a cadeia de intermediação da operação; II – " +
        `${percentualComExtenso(multaPct)} do valor bruto da operação realizada com circunvenção.`
    )
  );
  corpo.push(
    item(
      cMulta.item(),
      "A PARTE infratora responde ainda por lucros cessantes, danos emergentes, danos reputacionais e honorários " +
        "advocatícios."
    )
  );
  corpo.push(
    item(
      cMulta.item(),
      "As PARTES reconhecem este instrumento como título executivo extrajudicial, nos termos do art. 784, III, do " +
        "Código de Processo Civil, quando assinado por duas testemunhas."
    )
  );

  // ----- advertências do ativo: a prova de que o documento se adaptou -----

  if (perfil.alertas.length > 0) {
    const cAlertas = c.proxima(`DAS ADVERTÊNCIAS ESPECÍFICAS — ${perfil.nome.toUpperCase()}`);
    corpo.push(clausulaTitulo(cAlertas.cabecalho));
    corpo.push(
      item(
        cAlertas.item(),
        "As PARTES declaram ciência das condições próprias deste ativo, que integram este instrumento para todos " +
          "os efeitos:"
      )
    );
    perfil.alertas.forEach((alerta) => corpo.push(item(cAlertas.item(), alerta)));
  }

  corpo.push(...clausulaForo(ctx, `CLÁUSULA ${ordinalClausula(c.atual + 1)}`));

  corpo.push(fechamentoEletronico(true));

  return {
    titulo: `Acordo de Não Circunvenção e Confidencialidade — ${perfil.nome}`,
    subtitulo: "Non-Circumvention, Non-Disclosure Agreement — NCNDA",
    corpo,
    assinantes: assinantesDe(ctx, [
      "DIVULGADOR",
      "MANDATARIO_VENDA",
      "INTERMEDIARIO",
      "RECEPTOR",
      "MANDATARIO_COMPRA",
      "CEDENTE",
      "CESSIONARIO",
    ]),
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
          i.comissaoPercentual != null ? `${numero(Number(i.comissaoPercentual), 2)}%` : "a definir",
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
