/**
 * Gerador das duas peças do alongamento: o requerimento administrativo
 * (sempre o primeiro passo) e a petição inicial (para quando o banco recusa,
 * fica silente, ou a urgência não permite esperar).
 *
 * Reaproveita só as primitivas de formatação de `src/lib/documentos/base.ts`
 * (cabeçalho, título, parágrafo, assinaturas) — não o motor de contratos da
 * Gestão de Ativos (`ContextoDocumento`/`gerarDocumento`), que pressupõe
 * operação e partes cadastradas num modelo que não existe aqui.
 *
 * TUDO que sai como minuta, não como peça pronta para protocolar sem revisão:
 * o advogado confere cada marcador [ENTRE COLCHETES], anexa as provas e
 * decide a estratégia — o sistema nunca decide sozinho o que alegar.
 */
import crypto from "crypto";
import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import { titulo, subtitulo, clausulaTitulo, paragrafo, paragrafoRico, item, espaco, localEData, assinaturas, ou, paginaA4, rodape, cabecalho } from "@/lib/documentos/base";
import { moeda, dataExtenso } from "@/lib/formato";
import type { ResultadoAlongamento, Alerta, Orientacao } from "./alongamento";
import type { ResultadoMp1376 } from "./mp1376";
import { PRECEDENTES_SUMULA_298, DOUTRINA_ALONGAMENTO, JURISPRUDENCIA_NAO_VERIFICADA } from "./jurisprudencia";

export type DadosPeticaoAgro = {
  autorNome: string | null;
  autorDocumento: string | null;
  autorQualificacao: string | null;

  reuNome: string | null;
  reuEndereco: string | null;

  advogadoNome: string | null;
  advogadoOab: string | null;

  comarcaForo: string | null;
  varaForo: string | null;
  cidade: string | null;
  uf: string | null;

  numeroContrato: string | null;
  dataContratacao: Date | null;
  valorOperacao: number | null;
  categoriaOperacao: string | null;
  categoriaBeneficiario: string | null;
  desequilibrioContratual: string | null;
  riscosIdentificados: string[];

  resultado: ResultadoAlongamento;
  resultadoMp1376: ResultadoMp1376 | null;

  /**
   * Aviso sobre a vigência da MP, quando ela deixou de estar em tramitação
   * normal (convertida, caducada, rejeitada). Entra na peça como advertência.
   */
  avisoVigenciaMp: string | null;

  valorCausa: number | null;
};

const ROTULO_CATEGORIA_OPERACAO: Record<string, string> = {
  CUSTEIO: "custeio",
  COMERCIALIZACAO: "comercialização",
  INDUSTRIALIZACAO: "industrialização",
  INVESTIMENTO: "investimento",
};

const ROTULO_CATEGORIA_BENEFICIARIO: Record<string, string> = {
  PRONAF: "Pronaf",
  PRONAMP: "Pronamp",
  DEMAIS: "demais produtores",
};

/**
 * Local e data da assinatura. Sem cidade/UF preenchidas, `localEData` sairia
 * como "/, 7 de setembro de 2026" — uma lacuna silenciosa. Aqui ela vira um
 * marcador visível, que é a regra do resto das minutas.
 */
function localEDataAgro(d: DadosPeticaoAgro): Paragraph {
  const cidade = (d.cidade ?? "").trim();
  const uf = (d.uf ?? "").trim();
  if (cidade && uf) return localEData(cidade, uf, new Date());
  const data = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  return paragrafo(`${ou(cidade || null, "cidade")}/${ou(uf || null, "uf")}, ${data}.`, { alinhamento: AlignmentType.CENTER });
}

function nomeArquivo(base: string): string {
  const data = new Date().toISOString().slice(0, 10);
  return `${base}-${data}.docx`;
}

/** Exportado para o gerador da petição por IA (`peticao-ia.ts`), que monta o mesmo tipo de .docx a partir de texto livre em vez dos parágrafos fixos daqui. */
export async function empacotar(secoes: (Paragraph)[], tituloDoc: string, subtituloDoc?: string): Promise<{ buffer: Buffer; hashSha256: string }> {
  const construir = (codigo?: string) =>
    new Document({
      title: tituloDoc,
      sections: [
        {
          properties: paginaA4,
          headers: { default: cabecalho(null, null) },
          footers: { default: rodape(codigo) },
          children: [titulo(tituloDoc), ...(subtituloDoc ? [subtitulo(subtituloDoc)] : []), ...secoes],
        },
      ],
    });

  const provisorio = await Packer.toBuffer(construir());
  const hash = crypto.createHash("sha256").update(provisorio).digest("hex");
  const codigo = hash.slice(0, 8).toUpperCase();
  const buffer = Buffer.from(await Packer.toBuffer(construir(codigo)));
  return { buffer, hashSha256: crypto.createHash("sha256").update(buffer).digest("hex") };
}

// ---------------------------------------------------------------------
// Requerimento administrativo
// ---------------------------------------------------------------------

export async function gerarRequerimentoAdministrativo(d: DadosPeticaoAgro): Promise<{ buffer: Buffer; nomeArquivo: string; hashSha256: string }> {
  // As descrições vêm com ponto final; aqui elas entram no meio de uma frase.
  const hipoteses = d.resultado.hipotesesReconhecidas.map((h) => h.descricao.trim().replace(/\.+$/, ""));

  const corpo: Paragraph[] = [
    paragrafo(`À ${ou(d.reuNome, "instituição financeira")}`, { negrito: true }),
    d.reuEndereco ? paragrafo(d.reuEndereco) : paragrafo(ou(null, "endereço da instituição")),
    espaco(200),

    paragrafo(`Assunto: Requerimento de prorrogação (alongamento) de dívida de crédito rural — Contrato nº ${ou(d.numeroContrato, "número do contrato")}.`, {
      negrito: true,
    }),
    espaco(200),

    paragrafo(
      `${ou(d.autorNome, "nome do requerente")}, CPF/CNPJ ${ou(d.autorDocumento, "documento")}${
        d.autorQualificacao ? `, ${d.autorQualificacao}` : ""
      }, vem respeitosamente requerer a esta instituição financeira, com fundamento na Súmula 298 do Superior Tribunal de Justiça e no item 2-6-4 do Manual de Crédito Rural do Banco Central do Brasil, a prorrogação da operação de crédito rural de ${
        d.categoriaOperacao ? ROTULO_CATEGORIA_OPERACAO[d.categoriaOperacao] ?? d.categoriaOperacao : ou(null, "modalidade da operação")
      } identificada acima, contratada em ${d.dataContratacao ? dataExtenso(d.dataContratacao) : ou(null, "data de contratação")}, no valor de ${
        d.valorOperacao ? moeda(d.valorOperacao) : ou(null, "valor da operação")
      }.`
    ),

    clausulaTitulo("Da hipótese legal"),
    hipoteses.length > 0
      ? paragrafo(
          `O requerente enquadra-se na(s) seguinte(s) hipótese(s) do item 2-6-4 do Manual de Crédito Rural, que autoriza(m) a prorrogação mediante comprovação de dificuldade temporária para o reembolso do crédito: ${hipoteses
            .map((h) => h.toLowerCase())
            .join("; ")}.`
        )
      : paragrafo(ou(null, "hipótese do MCR 2-6-4 aplicável — preencher antes de protocolar")),

    clausulaTitulo("Da comprovação"),
    paragrafo(
      "Acompanha o presente requerimento laudo técnico emitido por profissional habilitado, que demonstra a intensidade do evento gerador da dificuldade de reembolso e o percentual de redução da renda bruta esperada para a safra ou atividade financiada, conforme documentos anexos."
    ),

    clausulaTitulo("Do pedido"),
    item("1.", "A prorrogação da dívida acima identificada, nos mesmos encargos financeiros pactuados no instrumento de crédito, nos termos do item 2-6-4 do Manual de Crédito Rural e da Súmula 298 do Superior Tribunal de Justiça;"),
    item("2.", "Resposta por escrito, fundamentada e individualizada, no prazo de 10 (dez) dias úteis contados do recebimento deste requerimento;"),
    item("3.", "Caso a instituição entenda necessária vistoria técnica para a produção do laudo, que indique, desde já, assistente técnico para acompanhá-la em data e hora combinadas, dado o interesse do requerente em produzir prova sob contraditório."),

    espaco(200),
    paragrafo(
      "Nestes termos, pede deferimento.",
      { alinhamento: AlignmentType.CENTER }
    ),

    localEDataAgro(d),

    ...assinaturas([
      { nome: ou(d.autorNome, "nome do requerente"), papel: "Requerente" },
      ...(d.advogadoNome ? [{ nome: d.advogadoNome, papel: `Advogado(a) — OAB ${ou(d.advogadoOab, "número")}` }] : []),
    ]),

    espaco(300),
    paragrafo(
      "Fundamentos: Súmula 298/STJ; MCR 2-6-4 (Manual de Crédito Rural, Banco Central do Brasil); Lei nº 4.829/65.",
      { italico: true, alinhamento: AlignmentType.JUSTIFIED }
    ),
  ];

  const { buffer, hashSha256 } = await empacotar(corpo, "Requerimento de Prorrogação de Dívida Rural", "Item 2-6-4 do Manual de Crédito Rural — Súmula 298/STJ");
  return { buffer, nomeArquivo: nomeArquivo("requerimento-administrativo-alongamento"), hashSha256 };
}

// ---------------------------------------------------------------------
// Petição inicial
// ---------------------------------------------------------------------

function paragrafosDeAlertas(itens: Alerta[]): Paragraph[] {
  return itens.flatMap((a) => [
    paragrafoRico(`**${a.titulo}.** ${a.texto}`),
    paragrafo(`Fundamento: ${a.fonte}.`, { italico: true, espacoDepois: 220 }),
  ]);
}

function paragrafosDeOrientacoes(itens: Orientacao[]): Paragraph[] {
  return itens.flatMap((o) => [
    paragrafoRico(`**${o.titulo}.** ${o.texto}`),
    paragrafo(`Fundamento: ${o.fonte}.`, { italico: true, espacoDepois: 220 }),
  ]);
}

export async function gerarPeticaoInicial(d: DadosPeticaoAgro): Promise<{ buffer: Buffer; nomeArquivo: string; hashSha256: string }> {
  const r = d.resultado;
  const regimeTexto =
    r.regimeAplicavel === "ANTERIOR_5314"
      ? "Os fatos são anteriores a 01/07/2026 — regidos pela redação do Manual de Crédito Rural anterior à Resolução CMN nº 5.314/2026, quando a prorrogação era devida mediante comprovação da dificuldade temporária, nos termos da Súmula 298 do Superior Tribunal de Justiça."
      : r.regimeAplicavel === "POSTERIOR_5314"
        ? "Os fatos são posteriores a 01/07/2026, quando passou a viger a Resolução CMN nº 5.314/2026, que reescreveu a Seção 6 do Capítulo 2 do Manual de Crédito Rural e passou a condicionar a prorrogação à conveniência da instituição financeira — norma cuja validade se impugna nos termos abaixo."
        : "[REGIME APLICÁVEL NÃO DEFINIDO — CONFIRME A DATA DE CONTRATAÇÃO E DO PEDIDO ADMINISTRATIVO ANTES DE PROTOCOLAR]";

  const corpo: Paragraph[] = [
    paragrafo(
      `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ${ou(d.varaForo, "vara")} DA COMARCA DE ${ou(
        d.comarcaForo,
        "comarca"
      )}`,
      { negrito: true, alinhamento: AlignmentType.CENTER, espacoDepois: 480 }
    ),

    paragrafo(
      `${ou(d.autorNome, "nome do autor")}, CPF/CNPJ ${ou(d.autorDocumento, "documento")}${
        d.autorQualificacao ? `, ${d.autorQualificacao}` : ""
      }, por seu(sua) advogado(a) que esta subscreve (procuração anexa), vem, respeitosamente, à presença de Vossa Excelência propor a presente`,
      { espacoDepois: 100 }
    ),
    paragrafo(
      "AÇÃO REVISIONAL DE CLÁUSULAS CONTRATUAIS C/C ALONGAMENTO DE DÍVIDA DE CRÉDITO RURAL, COM PEDIDO DE TUTELA DE URGÊNCIA",
      { negrito: true, alinhamento: AlignmentType.CENTER, espacoDepois: 240 }
    ),
    paragrafo(
      `em face de ${ou(d.reuNome, "instituição financeira ré")}${d.reuEndereco ? `, com endereço em ${d.reuEndereco}` : ""}, pelos fatos e fundamentos a seguir expostos.`
    ),

    clausulaTitulo("I — Dos Fatos"),
    paragrafo(
      `A parte autora é ${d.categoriaBeneficiario ? `produtor(a) rural enquadrado(a) no ${ROTULO_CATEGORIA_BENEFICIARIO[d.categoriaBeneficiario] ?? d.categoriaBeneficiario}` : ou(null, "qualificação como produtor rural")}, e mantém com a ré operação de crédito rural de ${
        d.categoriaOperacao ? ROTULO_CATEGORIA_OPERACAO[d.categoriaOperacao] ?? d.categoriaOperacao : ou(null, "modalidade")
      }, Contrato nº ${ou(d.numeroContrato, "número")}, contratada em ${d.dataContratacao ? dataExtenso(d.dataContratacao) : ou(null, "data de contratação")}, no valor de ${
        d.valorOperacao ? moeda(d.valorOperacao) : ou(null, "valor")
      }.`
    ),
    paragrafo(regimeTexto),
    ...(d.desequilibrioContratual ? [paragrafo(`Registra-se ainda o seguinte desequilíbrio contratual identificado: ${d.desequilibrioContratual}`)] : []),
    ...(d.riscosIdentificados.length > 0
      ? [paragrafo(`Foram identificados os seguintes pontos de risco no instrumento contratual: ${d.riscosIdentificados.join("; ")}.`)]
      : []),

    clausulaTitulo("II — Do Direito"),
    paragrafo("II.1 — Do direito ao alongamento da dívida rural", { negrito: true, espacoDepois: 120 }),
    ...paragrafosDeOrientacoes(r.orientacoes),
    ...paragrafosDeAlertas(r.alertas.filter((a) => a.gravidade !== "INFORMATIVO")),

    paragrafo("II.2 — Da jurisprudência do Superior Tribunal de Justiça", { negrito: true, espacoDepois: 120 }),
    paragrafo(
      "Ainda que os precedentes abaixo tenham sido formados sob a Lei nº 9.138/1995, o princípio neles fixado — de " +
      "que o alongamento é direito do devedor, e não faculdade da instituição financeira — decorre do regime " +
      "geral do crédito rural e não se esgota naquele diploma, permanecendo aplicável por analogia ao regime do " +
      "MCR 2-6-4 e, no que couber, à composição de dívidas da MP nº 1.376/2026:"
    ),
    ...PRECEDENTES_SUMULA_298.map((p) =>
      item(
        `${p.identificacao} (${p.orgaoJulgador}, Rel. ${p.relator}, j. ${p.dataJulgamento}, DJ ${p.dataPublicacaoDJ}):`,
        `"${p.trecho}"${p.observacao ? ` — ${p.observacao}` : ""}`
      )
    ),
    paragrafo("Fonte: STJ, Revista de Súmulas (RSSTJ), a. 5, (23): 315-358, outubro de 2011 — inteiro teor oficial.", { italico: true, espacoDepois: 220 }),

    paragrafo("II.3 — Da doutrina", { negrito: true, espacoDepois: 120 }),
    ...DOUTRINA_ALONGAMENTO.map((doc) => item(`${doc.autor}, ${doc.obra} (${doc.dadosEdicao}):`, doc.trecho ? `"${doc.trecho}"` : "")),

    ...(JURISPRUDENCIA_NAO_VERIFICADA.length > 0
      ? [
          paragrafo(
            "[ADVERTÊNCIA AO ADVOGADO: há referência, em fonte secundária, ao seguinte julgado em sentido " +
              `contrário — confira o inteiro teor na fonte primária antes de mencioná-lo ou de se preparar para ` +
              `enfrentá-lo: ${JURISPRUDENCIA_NAO_VERIFICADA[0].identificacao} — ${JURISPRUDENCIA_NAO_VERIFICADA[0].trecho}]`,
            { italico: true }
          ),
        ]
      : []),

    ...(d.resultadoMp1376
      ? [
          paragrafo("II.4 — Subsidiariamente: enquadramento na MP nº 1.376/2026", { negrito: true, espacoDepois: 120 }),
          paragrafo(
            d.resultadoMp1376.enquadraNaMP1376 === true
              ? `Ainda que superada a tese acima, subsidiariamente, o caso também se enquadra na linha de composição de dívidas da Medida Provisória nº 1.376, de 15 de julho de 2026 (modalidade ${
                  d.resultadoMp1376.modalidade === "FAVORECIDA" ? "favorecida" : "geral"
                }), o que reforça o direito ora pleiteado.`
              : "A parte autora ressalva que a linha específica da Medida Provisória nº 1.376/2026 foi também analisada, mas [CONFERIR ENQUADRAMENTO ANTES DE CITAR NA PEÇA — VER PARECER MP 1.376 DESTE CONTRATO]."
          ),
          paragrafo(`Fonte: ${d.resultadoMp1376.fonte}.`, { italico: true, espacoDepois: d.avisoVigenciaMp ? 120 : 220 }),
          // Medida provisória tem prazo. Se ela já mudou de estado, a peça não
          // pode citá-la como se nada tivesse acontecido.
          ...(d.avisoVigenciaMp
            ? [paragrafo(`[ADVERTÊNCIA AO ADVOGADO: ${d.avisoVigenciaMp}]`, { italico: true, espacoDepois: 220 })]
            : []),
        ]
      : []),

    paragrafo("II.5 — Da revisão contratual", { negrito: true, espacoDepois: 120 }),
    paragrafo(
      "Ainda que se reconheça a validade da contratação em sua origem, os fatos supervenientes e desproporcionais autorizam a revisão das cláusulas contratuais, com fundamento na função social do contrato, na boa-fé objetiva e na vedação ao abuso de direito (Código Civil, arts. 421, 422 e 187), e, se caracterizada onerosidade excessiva por acontecimentos extraordinários e imprevisíveis, na teoria da imprevisão (Código Civil, arts. 478 a 480)."
    ),
    paragrafo(
      "[ADVERTÊNCIA AO ADVOGADO: confira se a relação se qualifica como consumerista antes de invocar o CDC — crédito tomado para atividade produtiva, em regra, não atrai o Código de Defesa do Consumidor pela teoria finalista do STJ, salvo hipótese de vulnerabilidade caracterizada (finalismo aprofundado), que precisa ser demonstrada no caso concreto.]",
      { italico: true }
    ),

    paragrafo("II.6 — Da fragilidade da prova unilateral e da necessidade de contraditório", { negrito: true, espacoDepois: 120 }),
    paragrafo(
      "Registra-se que o laudo técnico produzido unilateralmente, sem a participação da parte ré, possui força probatória mitigada, servindo apenas para esclarecer fatos, sem caráter conclusivo. Por isso, e para os fins do art. 381 do Código de Processo Civil, requer-se abaixo a produção de prova sob contraditório."
    ),

    clausulaTitulo("III — Da Tutela de Urgência"),
    paragrafo(
      "Estão presentes a probabilidade do direito, evidenciada pelos fundamentos acima, e o perigo de dano, consistente no risco de agravamento da situação da parte autora enquanto pendente o julgamento definitivo, nos termos do art. 300 do Código de Processo Civil. Requer-se, em caráter de urgência, inaudita altera parte ou após justificação prévia:"
    ),
    item("a)", "a suspensão de atos de cobrança e da execução em curso relativa ao contrato objeto desta ação, até o julgamento final;"),
    item("b)", "a abstenção de inclusão do nome da parte autora em cadastros de proteção ao crédito e de protesto do título relativo à dívida discutida;"),
    item("c)", "a suspensão de atos de execução das garantias vinculadas à operação (hipoteca, penhor, alienação fiduciária ou aval), até decisão final;"),
    item("d)", "a determinação de produção de prova pericial ou antecipada (CPC, arts. 381 e 464 e seguintes), com a participação da parte ré e de assistentes técnicos, para apurar a intensidade do evento gerador da dificuldade de reembolso e o percentual de redução da renda."),

    clausulaTitulo("IV — Dos Pedidos"),
    paragrafo("Diante do exposto, requer-se:"),
    item("1.", "a concessão da tutela de urgência nos termos do item III, supra;"),
    item("2.", "a citação da parte ré para, querendo, contestar a presente ação, sob pena de revelia;"),
    item(
      "3.",
      r.regimeAplicavel === "POSTERIOR_5314"
        ? "o afastamento, incidentalmente, da aplicação da Resolução CMN nº 5.314/2026 ao caso concreto, por contrariar o regime legal do crédito rural e a Súmula 298 do Superior Tribunal de Justiça;"
        : "o reconhecimento do direito da parte autora ao alongamento da dívida de crédito rural identificada, nos termos da Súmula 298 do Superior Tribunal de Justiça e do item 2-6-4 do Manual de Crédito Rural;"
    ),
    item("4.", "a condenação da parte ré a proceder ao alongamento/prorrogação da dívida, nos mesmos encargos financeiros pactuados, ou, subsidiariamente, a analisar e responder de forma fundamentada e individualizada o pedido administrativo, sob pena de multa diária;"),
    item("5.", "a revisão das cláusulas contratuais indicadas nos fundamentos desta petição, com o reequilíbrio da relação contratual;"),
    item("6.", "a produção de todos os meios de prova em direito admitidos, notadamente prova documental, pericial e testemunhal;"),
    item("7.", "a condenação da parte ré ao pagamento das custas processuais e dos honorários advocatícios."),

    clausulaTitulo("V — Das Provas"),
    paragrafo(
      "Protesta a parte autora por todos os meios de prova em direito admitidos, especialmente prova documental (contrato e aditivos, laudo técnico, requerimento administrativo e eventual resposta, comprovantes de perda de safra, documentos climáticos e de Proagro/seguro rural), prova pericial e prova testemunhal, sem prejuízo de outras que se fizerem necessárias."
    ),

    clausulaTitulo("VI — Do Valor da Causa"),
    paragrafo(`Dá-se à causa o valor de ${d.valorCausa ? moeda(d.valorCausa) : ou(null, "valor da causa")}, para fins de alçada.`),

    espaco(200),
    paragrafo("Nestes termos, pede deferimento.", { alinhamento: AlignmentType.CENTER }),
    localEDataAgro(d),

    ...assinaturas([{ nome: ou(d.advogadoNome, "nome do(a) advogado(a)"), papel: `Advogado(a) — OAB ${ou(d.advogadoOab, "número")}` }]),

    espaco(400),
    clausulaTitulo("Documentos que devem instruir esta petição (anexar antes de protocolar)"),
    ...d.resultado.documentosNecessarios.map((doc, i) => item(`${i + 1}.`, doc)),
  ];

  const { buffer, hashSha256 } = await empacotar(
    corpo,
    "Petição Inicial",
    "Ação Revisional c/c Alongamento de Dívida de Crédito Rural — minuta para revisão do advogado"
  );
  return { buffer, nomeArquivo: nomeArquivo("peticao-inicial-alongamento"), hashSha256 };
}

// ---------------------------------------------------------------------
// Monta os dados da peça a partir do contrato salvo
// ---------------------------------------------------------------------

/** Formato mínimo de `AgroContrato` que este mapeador precisa — evita importar o tipo gerado do Prisma aqui. */
export type AgroContratoParaPeticao = {
  mutuarioNome: string | null;
  mutuarioDocumento: string | null;
  instituicaoFinanceira: string | null;
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
  desequilibrioContratual: string | null;
  riscosIdentificados: unknown;
  resultadoAlongamento: unknown;
  resultadoMp1376: unknown;
  valorCausa: unknown;
};

export function montarDadosPeticao(c: AgroContratoParaPeticao, avisoVigenciaMp: string | null = null): DadosPeticaoAgro | null {
  if (!c.resultadoAlongamento) return null;

  return {
    autorNome: c.mutuarioNome,
    autorDocumento: c.mutuarioDocumento,
    autorQualificacao: null,
    reuNome: c.instituicaoFinanceira,
    reuEndereco: c.enderecoBancoReu,
    advogadoNome: c.advogadoNome,
    advogadoOab: c.advogadoOab,
    comarcaForo: c.comarcaForo,
    varaForo: c.varaForo,
    cidade: null,
    uf: null,
    numeroContrato: c.numeroContrato,
    dataContratacao: c.dataContratacao,
    valorOperacao: c.valorOperacao === null || c.valorOperacao === undefined ? null : Number(c.valorOperacao),
    categoriaOperacao: c.categoriaOperacao,
    categoriaBeneficiario: c.categoriaBeneficiario,
    desequilibrioContratual: c.desequilibrioContratual,
    riscosIdentificados: (c.riscosIdentificados as string[] | null) ?? [],
    resultado: c.resultadoAlongamento as ResultadoAlongamento,
    resultadoMp1376: (c.resultadoMp1376 as ResultadoMp1376 | null) ?? null,
    avisoVigenciaMp,
    valorCausa: c.valorCausa === null || c.valorCausa === undefined ? null : Number(c.valorCausa),
  };
}
