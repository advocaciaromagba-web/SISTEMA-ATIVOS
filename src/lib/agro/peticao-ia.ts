/**
 * Geração da peça (requerimento administrativo ou petição inicial) inteira
 * redigida livremente pela IA — escolha explícita do cliente, feita
 * conscientemente depois de avisado do risco de alucinação em vez da opção
 * mais segura (uma seção limitada dentro do modelo fixo de `documentos.ts`).
 *
 * A liberdade de redação não abre mão da regra de sempre: a IA só recebe os
 * fatos que o sistema já verificou (do contrato, dos motores determinísticos
 * de `mp1376.ts`/`alongamento.ts`/`taxas.ts`/`cobrancas.ts`, e dos anexos
 * revisados pela pessoa) e o catálogo de jurisprudência/doutrina já conferido
 * na fonte primária
 * (`jurisprudencia.ts`). A instrução deixa explícito: nada fora disso pode
 * ser citado, e todo dado que falte entra como `[CONFIRMAR: ...]`, nunca
 * como suposição. O texto gerado nunca sai como peça pronta — sempre como
 * minuta marcada para revisão, tanto no aviso desta instrução quanto,
 * independente de a IA obedecer ou não, no próprio cabeçalho do .docx
 * montado por `montarDocumentoIa`.
 */
import type { Paragraph } from "docx";
import { perguntarTexto, iaConfigurada } from "@/lib/ia/claude";
import { paragrafo, paragrafoRico, clausulaTitulo, espaco } from "@/lib/documentos/base";
import { empacotar } from "./documentos";
import { moeda, dataExtenso } from "@/lib/formato";
import type { ResultadoAlongamento } from "./alongamento";
import type { ResultadoMp1376 } from "./mp1376";
import type { ResultadoTaxas } from "./taxas";
import type { ResultadoCobrancas } from "./cobrancas";
import { PRECEDENTES_SUMULA_298, DOUTRINA_ALONGAMENTO, JURISPRUDENCIA_NAO_VERIFICADA, SUMULAS_ADICIONAIS_VERIFICADAS } from "./jurisprudencia";

export type TipoPeticaoIa = "REQUERIMENTO_ADMINISTRATIVO" | "PETICAO_INICIAL";

/** Só os campos que este gerador usa — evita importar o tipo gerado do Prisma aqui, mesmo padrão de `documentos.ts`. */
export type AgroContratoParaPeticaoIa = {
  mutuarioNome: string | null;
  mutuarioDocumento: string | null;
  instituicaoFinanceira: string | null;
  instituicaoFinanceiraCnpj: string | null;
  enderecoBancoReu: string | null;
  advogadoNome: string | null;
  advogadoOab: string | null;
  comarcaForo: string | null;
  varaForo: string | null;
  numeroContrato: string | null;
  dataContratacao: Date | null;
  valorOperacao: unknown;
  categoriaOperacao: string | null;
  categoriaBeneficiario: string | null;
  numeroSafrasComPerda: number | null;
  percentualReducaoRenda: unknown;
  causaPerda: string | null;
  temLaudoTecnico: boolean | null;
  profissionalHabilitadoNome: string | null;
  profissionalHabilitadoRegistro: string | null;
  taxaJurosContratual: unknown;
  indexador: string | null;
  encargosMoratorios: string | null;
  tiposGarantia: unknown;
  garantiasDescricao: string | null;
  valorGarantia: unknown;
  temSeguroRural: boolean | null;
  seguradora: string | null;
  temProagro: boolean | null;
  indenizacaoRecebida: unknown;
  desequilibrioContratual: string | null;
  riscosIdentificados: unknown;
  dataVencimento: Date | null;
  dataPedidoAlongamento: Date | null;
  houvePedidoAdministrativo: boolean | null;
  respostaBanco: string | null;
  recusaFundamentadaPorEscrito: boolean | null;
  capacidadePagamentoResumo: string | null;
  capacidadePagamentoComprometida: boolean | null;
  resultadoAlongamento: unknown;
  resultadoMp1376: unknown;
  resultadoTaxas: unknown;
  resultadoCobrancas: unknown;
  valorCausa: unknown;
};

export type AnexoParaPeticaoIa = { tipo: string; nomeArquivo: string };

const ROTULO_TIPO: Record<TipoPeticaoIa, string> = {
  REQUERIMENTO_ADMINISTRATIVO: "requerimento administrativo de alongamento de dívida rural",
  PETICAO_INICIAL: "petição inicial de ação revisional c/c alongamento de dívida de crédito rural, com pedido de tutela de urgência",
};

/**
 * Só os fatos já verificados entram aqui — nenhum campo é calculado ou
 * estimado neste arquivo. Datas e valores saem formatados (não é invenção,
 * é a mesma formatação que `documentos.ts` já aplica) para a IA não
 * precisar (e não arriscar errar) fazer conta ou formatação de data.
 */
export function montarContextoPeticaoIa(
  c: AgroContratoParaPeticaoIa,
  anexos: AnexoParaPeticaoIa[],
  avisoVigenciaMp: string | null
): Record<string, unknown> {
  const resultadoAlongamento = (c.resultadoAlongamento as ResultadoAlongamento | null) ?? null;
  const resultadoMp1376 = (c.resultadoMp1376 as ResultadoMp1376 | null) ?? null;
  const resultadoTaxas = (c.resultadoTaxas as ResultadoTaxas | null) ?? null;
  const resultadoCobrancas = (c.resultadoCobrancas as ResultadoCobrancas | null) ?? null;

  return {
    parte_autora: {
      nome: c.mutuarioNome,
      cpf_ou_cnpj: c.mutuarioDocumento,
      categoria_beneficiario: c.categoriaBeneficiario,
    },
    parte_re: {
      nome: c.instituicaoFinanceira,
      cnpj: c.instituicaoFinanceiraCnpj,
      endereco: c.enderecoBancoReu,
    },
    advogado: { nome: c.advogadoNome, oab: c.advogadoOab },
    foro: { comarca: c.comarcaForo, vara: c.varaForo },
    contrato: {
      numero: c.numeroContrato,
      data_contratacao: c.dataContratacao ? dataExtenso(c.dataContratacao) : null,
      valor_operacao: c.valorOperacao === null || c.valorOperacao === undefined ? null : moeda(Number(c.valorOperacao)),
      categoria_operacao: c.categoriaOperacao,
      taxa_juros_contratual: c.taxaJurosContratual === null || c.taxaJurosContratual === undefined ? null : `${c.taxaJurosContratual}% a.a.`,
      indexador: c.indexador,
      encargos_moratorios: c.encargosMoratorios,
      tipos_garantia: c.tiposGarantia,
      garantias_descricao: c.garantiasDescricao,
      valor_garantia: c.valorGarantia === null || c.valorGarantia === undefined ? null : moeda(Number(c.valorGarantia)),
    },
    perda_de_safra: {
      numero_safras_com_perda: c.numeroSafrasComPerda,
      percentual_reducao_renda: c.percentualReducaoRenda === null || c.percentualReducaoRenda === undefined ? null : Number(c.percentualReducaoRenda),
      causa_perda: c.causaPerda,
      tem_laudo_tecnico: c.temLaudoTecnico,
      profissional_habilitado: { nome: c.profissionalHabilitadoNome, registro: c.profissionalHabilitadoRegistro },
    },
    seguro_rural: {
      tem_seguro_rural: c.temSeguroRural,
      seguradora: c.seguradora,
      tem_proagro: c.temProagro,
      indenizacao_recebida: c.indenizacaoRecebida === null || c.indenizacaoRecebida === undefined ? null : moeda(Number(c.indenizacaoRecebida)),
    },
    capacidade_de_pagamento: {
      // Esta é a prova central do prejuízo concreto — o pedido do cliente
      // foi explícito em exigir que a peça demonstre o impacto na
      // capacidade de pagamento do produtor, não só o enquadramento legal.
      comprometida: c.capacidadePagamentoComprometida,
      resumo_do_laudo: c.capacidadePagamentoResumo,
    },
    desequilibrio_contratual: {
      riscos_identificados: c.riscosIdentificados,
      descricao: c.desequilibrioContratual,
    },
    historico_do_pedido_administrativo: {
      data_vencimento_divida: c.dataVencimento ? dataExtenso(c.dataVencimento) : null,
      data_pedido_alongamento: c.dataPedidoAlongamento ? dataExtenso(c.dataPedidoAlongamento) : null,
      houve_pedido_administrativo: c.houvePedidoAdministrativo,
      resposta_do_banco: c.respostaBanco,
      recusa_fundamentada_por_escrito: c.recusaFundamentadaPorEscrito,
    },
    documentos_anexados_ao_cadastro: anexos.map((a) => ({ tipo: a.tipo, arquivo: a.nomeArquivo })),
    valor_da_causa: c.valorCausa === null || c.valorCausa === undefined ? null : moeda(Number(c.valorCausa)),

    // ---- resultado dos motores determinísticos: quem decide enquadramento é código, não a IA ----
    analise_alongamento_regime_geral: resultadoAlongamento,
    analise_enquadramento_mp_1376_2026: resultadoMp1376,
    // Comparação com a taxa média do Banco Central, capitalização de juros,
    // multa moratória e comissão de permanência (DL 167/67; Súmulas 93 e
    // 30/STJ) — cada alerta CRITICO aqui é abusividade já apurada pelo
    // sistema, não uma hipótese da IA.
    analise_taxas_e_encargos: resultadoTaxas,
    // Venda casada de seguro/produto vinculado ao crédito, e tarifas sem
    // amparo legal (TAC/TEC, tarifa de cadastro, tarifa de registro de
    // gravame) — CDC art. 39, I; Tema 972/STJ; Súmulas 565 e 566/STJ.
    analise_venda_casada_e_tarifas: resultadoCobrancas,
    aviso_sobre_vigencia_da_mp_1376: avisoVigenciaMp,

    // ---- ÚNICAS fontes de jurisprudência/doutrina que a IA pode citar ----
    fontes_permitidas_precedentes_stj: PRECEDENTES_SUMULA_298,
    fontes_permitidas_doutrina: DOUTRINA_ALONGAMENTO,
    // Súmulas 121 e 596/STF e 472/STJ — cada uma com o texto oficial e, onde
    // existe, a ressalva que muda o alcance prático (ex.: a 121 foi
    // relativizada pela MP 2.170-36/2001 para bancos; a 596 na verdade
    // AFASTA um argumento, não sustenta um). Ver `observacao` de cada item.
    fontes_permitidas_sumulas: SUMULAS_ADICIONAIS_VERIFICADAS,
    // Existe, mas NÃO pode ser citada como firme — ver instrução do sistema.
    jurisprudencia_conhecida_mas_nao_verificada_na_fonte_primaria: JURISPRUDENCIA_NAO_VERIFICADA,
  };
}

function instrucaoSistema(tipo: TipoPeticaoIa): string {
  return (
    `Você é um assistente jurídico que redige, por extenso e de forma livre, a minuta de um ${ROTULO_TIPO[tipo]}, ` +
    "em português, para um advogado de produtor rural brasileiro revisar antes de protocolar.\n\n" +
    "REGRAS ABSOLUTAS, que valem mais que qualquer convenção de estilo:\n\n" +
    "1. NUNCA invente fato, nome, número, data, valor, endereço, artigo de lei ou precedente. Você só pode " +
    "usar exatamente o que está no JSON de fatos fornecido na mensagem do usuário.\n" +
    "2. Se um dado necessário para a peça não estiver no JSON (ou estiver null), escreva literalmente " +
    '"[CONFIRMAR: <o que falta, em poucas palavras>]" no lugar exato onde o dado entraria. Nunca estime, nunca ' +
    "arredonde, nunca complete com um valor plausível.\n" +
    "3. Você só pode citar jurisprudência e doutrina que estejam nos campos `fontes_permitidas_precedentes_stj`, " +
    "`fontes_permitidas_doutrina` e `fontes_permitidas_sumulas` do JSON, citando exatamente a identificação, o " +
    "órgão julgador (quando houver), o relator (quando houver) e a data que constam ali — nunca parafraseie de " +
    "memória um precedente ou súmula que não esteja nesses campos, e nunca cite um artigo de lei, súmula, " +
    "resolução ou manual que não esteja mencionado no JSON (`analise_alongamento_regime_geral`, " +
    "`analise_enquadramento_mp_1376_2026`, `analise_taxas_e_encargos` e `analise_venda_casada_e_tarifas`, e os " +
    "campos `fonte`/`artigo` dentro deles, trazem as normas já verificadas: Súmula 298/STJ, MCR 2-6-4, Resolução " +
    "CMN 5.314/2026, MP nº 1.376/2026, Lei nº 4.829/65, Decreto-Lei nº 167/67, Súmulas 93 e 30/STJ, CDC art. 39, " +
    "I, Tema 972/STJ, Súmulas 565 e 566/STJ). Em `fontes_permitidas_sumulas` cada item pode trazer uma " +
    "`observacao` que muda o alcance prático da súmula (ex.: uma súmula relativizada por lei posterior para " +
    "bancos, ou uma súmula que na verdade AFASTA uma tese em vez de sustentá-la) — essa ressalva é parte " +
    "obrigatória da citação, nunca cite a súmula isolada do que a observação exige dizer junto. O campo " +
    "`jurisprudencia_conhecida_mas_nao_verificada_na_fonte_primaria` existe só para você saber que a outra parte " +
    "pode levantar aquele julgado — nunca o cite como precedente próprio, e se mencioná-lo, deixe explícito que " +
    "não foi confirmado na fonte primária.\n" +
    "4. Toda alegação de fato relevante (perda de safra, comprometimento da capacidade de pagamento, " +
    "desequilíbrio contratual, histórico do pedido administrativo) deve vir apoiada nos campos correspondentes " +
    "do JSON — não amplie, não dramatize além do que os dados sustentam.\n" +
    "5. Onde o JSON traz um resultado de análise jurídica (enquadramento na MP 1.376/2026, regime aplicável do " +
    "alongamento, força da tese, alertas e orientações, e os campos `analise_taxas_e_encargos` e " +
    "`analise_venda_casada_e_tarifas`), use esse resultado como está — não reavalie, não conclua diferente do " +
    "que o motor determinístico já decidiu. Se `enquadraNaMP1376` ou `enquadraComoCreditoRural` estiver como " +
    '"INDETERMINADO" ou false, trate isso como está: não afirme enquadramento que o sistema não confirmou.\n' +
    "6. TODO alerta de gravidade CRITICO ou ATENCAO dentro de `analise_taxas_e_encargos` e de " +
    "`analise_venda_casada_e_tarifas` é abusividade JÁ APURADA pelo sistema (capitalização de juros fora do " +
    "pactuado, multa moratória acima do limite legal, comissão de permanência cumulada, venda casada de seguro " +
    "vinculado ao financiador, tarifas sem amparo legal) — não são hipóteses da IA, e a peça deve tratar CADA " +
    "UM deles explicitamente, citando o artigo/súmula/tema exatos que já vêm no próprio alerta (campo `fonte`). " +
    "Omitir um alerta desses é omitir o motivo pelo qual a peça foi pedida.\n" +
    "7. Escreva com profundidade, não só com correção. Pedido expresso do cliente: a peça deve ser \"bem " +
    "fundamentada, bem detalhada, bem descrita, utilizando todas as linguagens jurídicas com fundamento, " +
    "doutrina, jurisprudência e tudo o que for possível, juridicamente possível\". Isso significa, para CADA " +
    "tese (alongamento, enquadramento na MP, cada abusividade de taxas/encargos, cada venda casada/tarifa): (a) " +
    "não apenas afirme a conclusão — explique o raciocínio que liga o fato do caso à fonte que o sustenta, como " +
    "um jurista desenvolveria o argumento num parecer; (b) quando houver mais de um precedente ou mais de uma " +
    "doutrina permitidos sobre a mesma tese, use e articule TODOS os que se aplicarem, não apenas um; (c) onde " +
    "uma súmula permitida tiver uma `observacao` de ressalva ou de contra-argumento (ver regra 3), antecipe e " +
    "afaste esse contra-argumento na própria peça, em vez de ignorá-lo — isso é o que torna a fundamentação " +
    "robusta, não frágil. Nada disso abre exceção às regras 1-3: profundidade vem de desenvolver melhor o que " +
    "já está verificado, nunca de complementar com o que não está.\n\n" +
    "ESTRUTURA:\n" +
    (tipo === "REQUERIMENTO_ADMINISTRATIVO"
      ? "Redija um requerimento administrativo endereçado à instituição financeira ré (identificada no JSON), " +
        "pedindo o alongamento/prorrogação da dívida com base nos fatos e no enquadramento fornecidos, anexando " +
        "os documentos indicados, com pedido de resposta fundamentada em prazo razoável. Feche com local, data e " +
        "espaço para assinatura do requerente e do advogado."
      : "Redija uma petição inicial completa: endereçamento ao juízo (comarca e vara do JSON), qualificação das " +
        "partes, nome da ação, DOS FATOS, DO DIREITO (alongamento da dívida rural, enquadramento subsidiário na " +
        "MP 1.376/2026 quando aplicável, e — seguindo a instrução expressa do cliente — demonstração de que o " +
        "produtor sofreu prejuízo concreto na capacidade de pagamento, usando o campo `capacidade_de_pagamento`), " +
        "com uma subseção específica DA ABUSIVIDADE DE CLÁUSULAS E ENCARGOS que trate, um a um, TODOS os alertas " +
        "de `analise_taxas_e_encargos` (capitalização de juros, multa moratória, comissão de permanência) e de " +
        "`analise_venda_casada_e_tarifas` (venda casada de seguro/produto vinculado, TAC/TEC, tarifa de cadastro, " +
        "tarifa de registro/gravame) — cada um com o fundamento exato que já vem no alerta, pedindo a revisão ou " +
        "nulidade da cláusula respectiva, DA TUTELA DE URGÊNCIA (suspensão de cobrança e de execução de " +
        "garantias, probabilidade do direito e perigo de dano), DOS PEDIDOS (alongamento, revisão contratual com " +
        "a declaração de nulidade de cada cláusula abusiva identificada, restituição do que foi cobrado a mais " +
        "quando cabível, tutela de urgência, produção de provas, custas e honorários), DAS PROVAS, DO VALOR DA " +
        "CAUSA, fecho com local, data e espaço de assinatura do advogado.") +
    "\n\nFORMATO DA RESPOSTA: texto simples em português, parágrafos separados por linha em branco, sem markdown " +
    "além de **negrito** ocasional para destacar um título de seção. Não devolva JSON. Comece a resposta " +
    "diretamente pela peça — sem preâmbulo do tipo \"aqui está a minuta\"."
  );
}

/** Divide o texto livre da IA em parágrafos do .docx, aplicando negrito onde a IA marcou com **. */
function textoParaParagrafos(texto: string): Paragraph[] {
  const blocos = texto
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocos.map((bloco) => {
    const linhaUnica = bloco.replace(/\s*\n\s*/g, " ").trim();
    // Heurística de título de seção: linha curta, sem ponto final, em
    // caixa alta (ex.: "I — DOS FATOS") — o resto é parágrafo normal.
    const pareceTitulo = linhaUnica.length > 0 && linhaUnica.length <= 70 && !linhaUnica.includes(".") && linhaUnica === linhaUnica.toUpperCase() && /[A-ZÀ-Ú]/.test(linhaUnica);
    if (pareceTitulo) return clausulaTitulo(linhaUnica);
    return paragrafoRico(linhaUnica);
  });
}

export async function gerarPeticaoIaCompleta(
  tipo: TipoPeticaoIa,
  contrato: AgroContratoParaPeticaoIa,
  anexos: AnexoParaPeticaoIa[],
  avisoVigenciaMp: string | null,
  contaId: string | null
): Promise<
  | { ok: true; buffer: Buffer; nomeArquivo: string; hashSha256: string; texto: string; contexto: Record<string, unknown> }
  | { ok: false; erro: string }
> {
  if (!iaConfigurada()) return { ok: false, erro: "Inteligência artificial não configurada (ANTHROPIC_API_KEY)." };

  const contexto = montarContextoPeticaoIa(contrato, anexos, avisoVigenciaMp);

  const resposta = await perguntarTexto({
    instrucao: instrucaoSistema(tipo),
    conteudo: JSON.stringify(contexto, null, 2),
    contexto: { solucao: "AGROJUD", contaId, referencia: `Peça gerada por IA — ${ROTULO_TIPO[tipo]}` },
    // Petição inteira, redigida livremente: precisa de bem mais espaço do
    // que a leitura de um documento — e mais ainda depois de a peça passar
    // a tratar, uma a uma, as abusividades de taxas e venda casada (ver
    // abaixo). Visto ao vivo: 12000 cortou a petição no meio de uma citação
    // quando a peça cresceu com essas seções novas. O modelo aceita até
    // 128K tokens de saída, então dar bastante folga aqui não custa nada
    // extra além do necessário.
    // Visto ao vivo: com `pensamentoProfundo` ligado, os tokens do
    // raciocínio (thinking) entram no MESMO `max_tokens` do texto final —
    // não são um orçamento à parte. Num teste real, o raciocínio consumiu
    // boa parte dos 20000 tokens antigos e a peça saiu cortada no meio de
    // uma frase (`tokensSaida` bateu exatamente no teto). Por isso o limite
    // sobe bem mais aqui: dá espaço de sobra tanto para o raciocínio quanto
    // para a peça inteira, bem mais fundamentada, que ele foi pedido para
    // produzir.
    maxTokens: 48000,
    // Redigir uma peça inteira demora mais que ler um documento — visto ao
    // vivo, uma petição real levou 91s e estourou o limite padrão de 90s
    // (ver comentário em `claude.ts`). Com `pensamentoProfundo` e um
    // `maxTokens` bem maior, o tempo de geração cresce mais ainda — 10
    // minutos dá folga real; ajustar de novo se o teste ao vivo mostrar que
    // não basta.
    tempoLimiteMs: 600_000,
    // Comparação ao vivo, mesmo contrato: tanto a gpt-4o-mini quanto a
    // gpt-4o (a "mais forte" da OpenAI) devolveram uma peça bem mais curta
    // que a do Claude Opus 5 e, o que importa mais, ignoraram os achados de
    // abusividade já apurados no contrato (venda casada, multa acima do
    // limite, comissão de permanência cumulada) — exatamente o que esta
    // peça existe para expor. Não é questão de tamanho de modelo dentro da
    // OpenAI: é diferença real de qualidade para esta tarefa específica de
    // sintetizar muitos fatos verificados numa peça coerente. Por isso esta
    // é a única tarefa do sistema fixada num provedor específico,
    // independente de `IA_PROVEDOR` — leitura de contrato e de anexo
    // continuam livres para usar o provedor mais barato.
    provedor: "anthropic",
    // Pedido explícito do cliente: "quando for pensamento profundo" a peça
    // deve ser bem fundamentada, detalhada e usar tudo o que for
    // juridicamente possível — isto liga o raciocínio estendido do modelo
    // (thinking adaptativo + esforço máximo) especificamente para esta
    // tarefa de síntese jurídica livre, a mais exigente do sistema.
    pensamentoProfundo: true,
  });

  if (!resposta.ok) return { ok: false, erro: resposta.erro };

  const dataGeracao = new Date().toLocaleString("pt-BR");
  const corpo: Paragraph[] = [
    paragrafo(
      "MINUTA GERADA POR INTELIGÊNCIA ARTIFICIAL — NÃO PROTOCOLAR SEM REVISÃO INTEGRAL DO ADVOGADO. Confira " +
        "cada dado, cada citação e cada marcador [CONFIRMAR: ...] antes de usar esta peça.",
      { negrito: true, espacoDepois: 320 }
    ),
    ...(resposta.cortada
      ? [
          paragrafo(
            "ATENÇÃO: esta minuta foi CORTADA ANTES DE TERMINAR — o espaço de resposta da IA acabou no meio do " +
              "texto (o parágrafo final abaixo está incompleto). Não é uma peça pronta nem para revisão parcial: " +
              "gere de novo antes de usar. A equipe já foi avisada para ajustar o limite.",
            { negrito: true, espacoDepois: 320 }
          ),
        ]
      : []),
    ...textoParaParagrafos(resposta.texto),
    espaco(300),
    paragrafo(`Minuta gerada por IA em ${dataGeracao}. Documento de rascunho — exige revisão humana antes de qualquer uso.`, {
      italico: true,
      espacoDepois: 0,
    }),
  ];

  const tituloDoc = tipo === "REQUERIMENTO_ADMINISTRATIVO" ? "Requerimento Administrativo — Minuta por IA" : "Petição Inicial — Minuta por IA";
  const { buffer, hashSha256 } = await empacotar(corpo, tituloDoc, "Rascunho gerado por inteligência artificial — revisão obrigatória do advogado");

  const data = new Date().toISOString().slice(0, 10);
  const nomeBase = tipo === "REQUERIMENTO_ADMINISTRATIVO" ? "requerimento-administrativo-ia" : "peticao-inicial-ia";
  const nomeArquivo = `${nomeBase}-${data}.docx`;

  return { ok: true, buffer, nomeArquivo, hashSha256, texto: resposta.texto, contexto };
}
