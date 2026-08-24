/**
 * Relatório de Due Diligence — o documento que o cliente recebe assinado.
 *
 * É o produto de maior valor da plataforma, e o mais perigoso de fazer errado.
 * Quem assina um laudo dizendo "nada consta" responde se o comprador perder
 * dinheiro. Por isso a estrutura aqui é rígida e não deve ser afrouxada:
 *
 *  1. ESCOPO — o que foi verificado, com data de cada consulta.
 *  2. O QUE NÃO FOI VERIFICADO — em seção própria, com o mesmo destaque do
 *     resto. É a parte que protege quem assina e a que mais falta nos laudos
 *     que circulam no mercado.
 *  3. ACHADOS — cada apontamento com gravidade, fonte e o que fazer.
 *  4. CONCLUSÃO — sem adjetivo solto: uma recomendação com condição.
 *  5. VALIDADE E LIMITES — o laudo vale para a data em que foi feito.
 *
 * Nenhuma frase aqui afirma que a parte "é idônea". O laudo diz o que as
 * fontes consultadas mostraram naquele dia. A diferença parece pequena e é
 * toda a diferença.
 */
import { clausulaTitulo, espaco, item, paragrafo, paragrafoRico, tabela } from "../base";
import { identificacao, nomeCurto, qualificar } from "../qualificacao";
import { descreverAtivo, linhasResumoAtivo, partesPor, type ContextoDocumento } from "../contexto";
import type { MontagemDocumento } from "../montagem";
import { dataExtenso, dataHora, moeda } from "@/lib/formato";
import { ROTULO_CAPACIDADE, ROTULO_IDONEIDADE, type Apontamento } from "@/lib/auditoria/tipos";

const ROTULO_GRAVIDADE: Record<string, string> = {
  GRAVE: "GRAVE",
  MEDIA: "Atenção",
  BAIXA: "Menor",
  INFO: "Informação",
};

/** O que a tela precisa carregar e passar para este gerador. */
export type ParteDiligenciada = {
  nome: string;
  papel: string;
  documento: string | null;
  qualificacao: string;
  identificacao: string;
  idoneidade: string | null;
  capacidade: string | null;
  pontuacao: number | null;
  parecer: string | null;
  auditadaEm: Date | null;
  apontamentos: Apontamento[];
  fontes: Array<{ fonte: string; status: string; resumo: string | null; consultadaEm: Date | null }>;
  certidoes: Array<{
    nome: string;
    orgao: string;
    resultado: string;
    natureza: string;
    apontamento: string | null;
    emitidaEm: Date | null;
    validaAte: Date | null;
    obrigatoria: boolean;
    estado: string;
  }>;
};

export type DadosDiligencia = {
  partes: ParteDiligenciada[];
  /** Quem assume a responsabilidade pelo laudo. */
  responsavel: { nome: string; cargo: string; registro: string | null };
  /** Quem contratou o relatório. */
  solicitante: string | null;
  validadeDias: number;
};

const ROTULO_FONTE: Record<string, string> = {
  RECEITA_CNPJ: "Receita Federal — cadastro nacional da pessoa jurídica",
  DIVIDA_ATIVA_UNIAO: "PGFN — dívida ativa da União",
  SANCOES_OFAC: "OFAC — listas internacionais de sanções",
  CEIS: "CEIS — empresas inidôneas e suspensas",
  CNEP: "CNEP — punidas pela Lei Anticorrupção",
  CEPIM: "CEPIM — impedidas de firmar convênios",
  BUREAU: "Bureau de crédito",
  DATAJUD: "DataJud — Conselho Nacional de Justiça",
  CADASTRO: "Cadastro interno",
};

export function gerarRelatorioDiligencia(ctx: ContextoDocumento): MontagemDocumento {
  const dados = ctx.diligencia;

  if (!dados || dados.partes.length === 0) {
    return {
      titulo: "Relatório de Due Diligence",
      corpo: [
        paragrafo(
          "[RELATÓRIO NÃO PÔDE SER MONTADO — nenhuma parte auditada foi encontrada nesta operação. " +
            "Execute a auditoria de cada parte antes de emitir o relatório.]"
        ),
      ],
      assinantes: [],
      comTestemunhas: false,
    };
  }

  const corpo = [];

  // ------------------------------------------------------------------
  // Identificação
  // ------------------------------------------------------------------
  corpo.push(clausulaTitulo("1. IDENTIFICAÇÃO"));
  corpo.push(
    tabela(
      ["Item", "Descrição"],
      [
        ["Emitido em", dataExtenso(ctx.agora)],
        ["Solicitante", dados.solicitante ?? ctx.organizacao.nome],
        ["Operação", ctx.operacao ? `${ctx.operacao.codigo} — ${ctx.operacao.titulo}` : "não vinculado a operação"],
        ["Partes analisadas", String(dados.partes.length)],
        ["Validade deste relatório", `${dados.validadeDias} dias a contar da emissão`],
      ]
    )
  );
  corpo.push(espaco(240));

  if (ctx.operacao) {
    corpo.push(clausulaTitulo("2. O ATIVO"));
    corpo.push(paragrafo(descreverAtivo(ctx)));
    const linhas = linhasResumoAtivo(ctx);
    if (linhas.length > 0) {
      corpo.push(tabela(["Item", "Descrição"], linhas));
      corpo.push(espaco(240));
    }
  }

  // ------------------------------------------------------------------
  // Escopo
  // ------------------------------------------------------------------
  corpo.push(clausulaTitulo(`${ctx.operacao ? "3" : "2"}. ESCOPO DA VERIFICAÇÃO`));
  corpo.push(
    paragrafo(
      "Foram consultadas as fontes indicadas abaixo, nas datas indicadas. Este relatório se limita ao que essas " +
        "fontes mostravam naquele momento."
    )
  );

  const fontesConsultadas = new Map<string, Date | null>();
  const fontesIndisponiveis = new Set<string>();

  for (const parte of dados.partes) {
    for (const f of parte.fontes) {
      if (f.status === "CONCLUIDA") {
        if (!fontesConsultadas.has(f.fonte)) fontesConsultadas.set(f.fonte, f.consultadaEm);
      } else {
        fontesIndisponiveis.add(f.fonte);
      }
    }
  }

  if (fontesConsultadas.size > 0) {
    corpo.push(
      tabela(
        ["Fonte", "Consultada em"],
        [...fontesConsultadas.entries()].map(([fonte, quando]) => [
          ROTULO_FONTE[fonte] ?? fonte,
          quando ? dataHora(quando) : "—",
        ])
      )
    );
    corpo.push(espaco(240));
  }

  // ------------------------------------------------------------------
  // O que NÃO foi verificado — a seção que protege quem assina
  // ------------------------------------------------------------------
  corpo.push(clausulaTitulo(`${ctx.operacao ? "4" : "3"}. O QUE NÃO FOI VERIFICADO`));
  corpo.push(
    paragrafoRico(
      "**Esta seção é parte essencial do relatório.** Um laudo que afirma \"nada consta\" sem dizer onde olhou " +
        "não tem valor. O que segue não foi verificado e permanece em aberto:"
    )
  );

  const naoVerificado: string[] = [];

  for (const fonte of fontesIndisponiveis) {
    naoVerificado.push(`${ROTULO_FONTE[fonte] ?? fonte}: consulta não concluída.`);
  }

  const certidoesPendentes = new Set<string>();
  for (const parte of dados.partes) {
    for (const c of parte.certidoes) {
      if (c.estado === "FALTA" || c.estado === "VENCIDA" || c.estado === "PENDENTE") {
        certidoesPendentes.add(`${c.nome} de ${parte.nome}`);
      }
    }
  }
  for (const pendente of certidoesPendentes) {
    naoVerificado.push(`${pendente}: não apresentada ou fora da validade.`);
  }

  naoVerificado.push(
    "Antecedentes criminais, mandados de prisão e distribuições judiciais: nenhuma base pública brasileira " +
      "permite consulta automatizada, de modo que estes pontos dependem exclusivamente das certidões " +
      "apresentadas e relacionadas neste relatório."
  );
  naoVerificado.push(
    "Situação financeira real, contabilidade, contratos privados e obrigações não registradas em base pública."
  );
  naoVerificado.push("Fatos posteriores à data de cada consulta.");

  for (const linha of naoVerificado) {
    corpo.push(paragrafo(`• ${linha}`, { espacoDepois: 100 }));
  }
  corpo.push(espaco(200));

  // ------------------------------------------------------------------
  // Parte a parte
  // ------------------------------------------------------------------
  let numero = ctx.operacao ? 5 : 4;

  for (const parte of dados.partes) {
    corpo.push(clausulaTitulo(`${numero}. ${parte.nome.toUpperCase()} — ${parte.papel}`));
    corpo.push(paragrafo(parte.qualificacao));

    corpo.push(
      tabela(
        ["Resultado", "Situação"],
        [
          ["Idoneidade", parte.idoneidade ? (ROTULO_IDONEIDADE[parte.idoneidade as never] ?? parte.idoneidade) : "não avaliada"],
          ["Capacidade de pagamento", parte.capacidade ? (ROTULO_CAPACIDADE[parte.capacidade as never] ?? parte.capacidade) : "não avaliada"],
          ["Pontuação", parte.pontuacao != null ? `${parte.pontuacao} de 100` : "—"],
          ["Auditada em", parte.auditadaEm ? dataHora(parte.auditadaEm) : "—"],
        ]
      )
    );
    corpo.push(espaco(200));

    if (parte.parecer) {
      corpo.push(item(`${numero}.1.`, parte.parecer));
    }

    // ----- achados -----
    const relevantes = parte.apontamentos.filter((a) => a.gravidade !== "INFO");

    if (relevantes.length > 0) {
      corpo.push(paragrafo("Achados:", { negrito: true, espacoDepois: 120 }));
      corpo.push(
        tabela(
          ["Gravidade", "Achado", "O que significa", "Fonte"],
          relevantes.map((a) => [
            ROTULO_GRAVIDADE[a.gravidade] ?? a.gravidade,
            a.titulo,
            a.detalhe,
            a.fonte,
          ])
        )
      );
      corpo.push(espaco(200));
    } else {
      corpo.push(
        paragrafo(
          "Não foram encontrados apontamentos nas fontes consultadas para esta parte. Isso não equivale a " +
            "atestado de idoneidade: vale para as fontes listadas no escopo e na data de cada consulta.",
          { espacoDepois: 200 }
        )
      );
    }

    // ----- certidões -----
    if (parte.certidoes.length > 0) {
      corpo.push(paragrafo("Certidões consideradas:", { negrito: true, espacoDepois: 120 }));
      corpo.push(
        tabela(
          ["Certidão", "Órgão", "Resultado", "Validade"],
          parte.certidoes.map((c) => [
            `${c.nome}${c.obrigatoria ? " (obrigatória)" : ""}`,
            c.orgao,
            c.resultado === "NADA_CONSTA"
              ? "Nada consta"
              : c.resultado === "CONSTA"
                ? `Consta — ${c.apontamento ?? "ver dossiê"}`
                : c.estado === "FALTA"
                  ? "NÃO APRESENTADA"
                  : c.estado === "VENCIDA"
                    ? "VENCIDA"
                    : "aguardando leitura",
            c.validaAte ? dataHora(c.validaAte).split(" ")[0] : "—",
          ])
        )
      );
      corpo.push(espaco(240));
    }

    numero += 1;
  }

  // ------------------------------------------------------------------
  // Conclusão
  // ------------------------------------------------------------------
  corpo.push(clausulaTitulo(`${numero}. CONCLUSÃO`));

  const comRestricao = dados.partes.filter((p) => p.idoneidade === "RESTRICAO");
  const comAtencao = dados.partes.filter((p) => p.idoneidade === "ATENCAO");
  const capacidadeFraca = dados.partes.filter(
    (p) => p.capacidade === "INSUFICIENTE" || p.capacidade === "LIMITADA"
  );

  if (comRestricao.length > 0) {
    corpo.push(
      paragrafoRico(
        `**Não recomendamos prosseguir** sem esclarecimento prévio. Foi encontrada restrição em ` +
          `${comRestricao.map((p) => p.nome).join(", ")}. Os achados classificados como GRAVE nas seções acima ` +
          "precisam ser resolvidos e documentados antes de qualquer assinatura ou pagamento."
      )
    );
  } else if (comAtencao.length > 0 || capacidadeFraca.length > 0) {
    corpo.push(
      paragrafoRico(
        "**Prosseguir com cautela e com garantias.** Não foi encontrada restrição impeditiva, mas há pontos de " +
          "atenção relacionados nas seções acima" +
          (capacidadeFraca.length > 0
            ? `, e a capacidade de pagamento de ${capacidadeFraca.map((p) => p.nome).join(", ")} não se mostrou ` +
              "compatível com o porte da operação"
            : "") +
          ". Recomendamos condicionar o negócio à apresentação dos documentos pendentes e à constituição de " +
          "garantia proporcional ao valor envolvido."
      )
    );
  } else {
    corpo.push(
      paragrafoRico(
        "**Não foram encontrados impedimentos** nas fontes consultadas e nas certidões apresentadas, na data " +
          "deste relatório. Permanecem em aberto os pontos da seção \"O que não foi verificado\", que devem ser " +
          "considerados na decisão."
      )
    );
  }

  // ------------------------------------------------------------------
  // Validade e limites
  // ------------------------------------------------------------------
  corpo.push(clausulaTitulo(`${numero + 1}. VALIDADE E LIMITES DESTE RELATÓRIO`));
  corpo.push(
    item(
      `${numero + 1}.1.`,
      `Este relatório vale por ${dados.validadeDias} dias contados da emissão. Situação cadastral, dívida e ` +
        "certidão mudam; passado esse prazo, a verificação precisa ser refeita."
    )
  );
  corpo.push(
    item(
      `${numero + 1}.2.`,
      "O relatório reflete o que as fontes relacionadas no escopo mostravam nas datas indicadas. Não alcança " +
        "fato não registrado em base pública, informação omitida pelas partes nem evento posterior às consultas."
    )
  );
  corpo.push(
    item(
      `${numero + 1}.3.`,
      "Este documento é peça de apoio à decisão. Não substitui a análise jurídica do contrato, a auditoria " +
        "contábil das partes nem a conferência do ativo junto ao órgão de origem, e não constitui recomendação " +
        "de investimento."
    )
  );
  corpo.push(
    item(
      `${numero + 1}.4.`,
      "As consultas que embasam este relatório ficam arquivadas com data e identificação, e podem ser " +
        "reapresentadas a qualquer tempo mediante solicitação."
    )
  );
  corpo.push(
    item(
      `${numero + 1}.5.`,
      "Os dados pessoais tratados observam a Lei nº 13.709/2018, restringindo-se seu uso à finalidade de " +
        "análise de contraparte e ao cumprimento das obrigações da Lei nº 9.613/1998."
    )
  );

  return {
    titulo: "Relatório de Due Diligence",
    subtitulo: `Análise de contraparte — emitido em ${dataExtenso(ctx.agora)}`,
    corpo,
    assinantes: [
      {
        nome: dados.responsavel.nome,
        identificacao: dados.responsavel.registro
          ? `${dados.responsavel.cargo} — ${dados.responsavel.registro}`
          : dados.responsavel.cargo,
        papel: `Responsável pela análise — ${ctx.organizacao.razaoSocial || ctx.organizacao.nome}`,
      },
    ],
    comTestemunhas: false,
  };
}

/** Resumo curto para a tela, antes de gerar. */
export function resumirDiligencia(dados: DadosDiligencia): string {
  const graves = dados.partes.reduce(
    (total, p) => total + p.apontamentos.filter((a) => a.gravidade === "GRAVE").length,
    0
  );
  const pendentes = dados.partes.reduce(
    (total, p) => total + p.certidoes.filter((c) => c.obrigatoria && c.estado !== "OK" && c.estado !== "APONTAMENTO").length,
    0
  );

  return (
    `${dados.partes.length} parte(s) analisada(s), ${graves} achado(s) grave(s), ` +
    `${pendentes} certidão(ões) obrigatória(s) pendente(s).`
  );
}

/** Usado pela tela para dizer quanto vale a operação sob análise. */
export function valorSobAnalise(ctx: ContextoDocumento): string {
  if (!ctx.operacao?.valorNegociado) return "";
  return moeda(Number(ctx.operacao.valorNegociado), ctx.operacao.moeda);
}

/** Qualificação usada no relatório, quando a parte é PJ ou PF. */
export function qualificarParaRelatorio(pessoa: Parameters<typeof qualificar>[0]) {
  return { qualificacao: qualificar(pessoa), identificacao: identificacao(pessoa), nome: nomeCurto(pessoa) };
}

export { partesPor };
