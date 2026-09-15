/**
 * Classificação automática do participante de um certame.
 *
 * Cruza três coisas que, até aqui, viviam separadas:
 *   1. o que o EDITAL exige (requisitos lidos do PDF — leitura-edital.ts);
 *   2. o que o PARTICIPANTE apresentou (documentos anexados e certidões
 *      emitidas direto na fonte);
 *   3. o que a DUE DILIGENCE encontrou sobre a empresa (motor-empresa.ts:
 *      Receita, CEIS/CNEP, dívida ativa, sanções internacionais).
 *
 * E devolve uma RECOMENDAÇÃO — nunca a decisão. Quem habilita ou inabilita é
 * a comissão de licitação, por ato próprio e motivado (Lei nº 14.133/2021,
 * art. 71; Lei nº 8.666/1993, art. 43). O que este módulo faz é não deixar
 * passar em branco o que é objetivo e conferível, e dizer claramente o que
 * depende de juízo humano.
 *
 * Duas regras de cautela que valem mais que a conveniência:
 *
 * - O que NÃO foi verificado nunca vira aprovação silenciosa. Fonte que não
 *   respondeu, requisito que a plataforma não sabe conferir e documento sem
 *   conferência de autenticidade entram como "conferir", não somem.
 * - Microempresa e EPP têm direito de sanar irregularidade FISCAL depois de
 *   declarada vencedora (LC nº 123/2006, arts. 42 e 43). Por isso, para elas,
 *   irregularidade fiscal não vira recomendação de inabilitar de imediato:
 *   vira diligência, com o prazo legal citado.
 */
import { documentoHabilitacao, CATEGORIAS_HABILITACAO, type CategoriaHabilitacao } from "./requisitos";
import type { LeituraEdital } from "./leitura-edital";
import type { Apontamento, DadosCadastrais } from "@/lib/auditoria/tipos";

export type TipoAchado = "IMPEDIMENTO" | "IRREGULARIDADE" | "PENDENCIA" | "CONFERIR";

export type AchadoClassificacao = {
  tipo: TipoAchado;
  titulo: string;
  detalhe: string;
  fonte: string;
  /** Dispositivo que sustenta o achado, quando há um objetivo. */
  baseLegal?: string;
};

export type Recomendacao = "HABILITAR" | "INABILITAR" | "DILIGENCIA";

export type ClassificacaoParticipante = {
  recomendacao: Recomendacao;
  resumo: string;
  achados: AchadoClassificacao[];
  /** ME/EPP muda o tratamento da irregularidade fiscal. */
  microempresa: boolean;
  requisitosDoEdital: number;
  requisitosAtendidos: number;
  /** Requisitos do edital que a plataforma não sabe conferir sozinha. */
  requisitosSemConferenciaAutomatica: number;
};

export type CertidaoDoParticipante = {
  tipo: string;
  /** NADA_CONSTA | CONSTA | PENDENTE */
  resultado: string;
  apontamento?: string | null;
};

export type DocumentoDoParticipante = {
  tipo: string;
  autenticidadeConferida: boolean;
  /** CONFERE | DIVERGE | NAO_VERIFICAVEL */
  autenticidadeResultado: string | null;
  /** Resultado da leitura automática do conteúdo, quando houve. */
  conferencia?: { tipo: "OK" | "ALERTA" | "DIVERGENCIA"; titulo: string; detalhe: string }[] | null;
};

const ROTULO_CATEGORIA = (c: string): string =>
  c in CATEGORIAS_HABILITACAO ? CATEGORIAS_HABILITACAO[c as CategoriaHabilitacao].nome : "Não identificada";

/** Situação na Receita que não seja ATIVA impede contratar. */
function situacaoCadastralImpede(dados: DadosCadastrais | null): AchadoClassificacao | null {
  const situacao = (dados?.situacao ?? "").toUpperCase();
  if (!situacao) return null;
  if (situacao.includes("ATIVA")) return null;

  return {
    tipo: "IMPEDIMENTO",
    titulo: `Situação cadastral: ${dados?.situacao}`,
    detalhe:
      `O CNPJ não está ativo na Receita Federal${dados?.motivoSituacao ? ` (${dados.motivoSituacao})` : ""}. ` +
      "Empresa sem inscrição regular não reúne condição de contratar com a Administração.",
    fonte: "Receita Federal",
    baseLegal: "Lei nº 14.133/2021, art. 62, I (habilitação jurídica) e art. 66",
  };
}

/**
 * Traduz o apontamento da due diligence para a régua da licitação.
 *
 * Nem todo apontamento grave do compliance é impedimento de licitar: dívida
 * ativa é irregularidade fiscal (sanável, e sanável mais tarde para ME/EPP),
 * enquanto estar no CEIS é impedimento direto. A diferença importa porque uma
 * inabilita e a outra abre prazo.
 */
function classificarApontamento(a: Apontamento): AchadoClassificacao | null {
  const fonte = (a.fonte ?? "").toUpperCase();
  const titulo = (a.titulo ?? "").toUpperCase();

  const ehSancao = fonte.includes("CEIS") || fonte.includes("CNEP") || titulo.includes("CEIS") || titulo.includes("CNEP");
  if (ehSancao) {
    return {
      tipo: "IMPEDIMENTO",
      titulo: a.titulo,
      detalhe: a.detalhe,
      fonte: a.fonte,
      baseLegal:
        "Lei nº 14.133/2021, arts. 14 e 156 (impedimento e declaração de inidoneidade); " +
        "Lei nº 8.666/1993, art. 87, III e IV",
    };
  }

  if (fonte.includes("OFAC") || titulo.includes("SANÇÃO INTERNACIONAL") || titulo.includes("SANCAO INTERNACIONAL")) {
    return {
      tipo: "IMPEDIMENTO",
      titulo: a.titulo,
      detalhe: a.detalhe,
      fonte: a.fonte,
      baseLegal: "Lei nº 13.810/2019 (cumprimento de sanções impostas por resoluções da ONU)",
    };
  }

  const ehFiscal =
    fonte.includes("PGFN") ||
    fonte.includes("DÍVIDA ATIVA") ||
    fonte.includes("DIVIDA ATIVA") ||
    titulo.includes("DÍVIDA ATIVA") ||
    titulo.includes("DIVIDA ATIVA");
  if (ehFiscal) {
    return {
      tipo: "IRREGULARIDADE",
      titulo: a.titulo,
      detalhe: a.detalhe,
      fonte: a.fonte,
      baseLegal: "Lei nº 14.133/2021, art. 68 (regularidade fiscal); Lei nº 8.666/1993, art. 29",
    };
  }

  // Apontamento grave que não se encaixa numa régua objetiva não pode sumir:
  // vira item de conferência da comissão.
  if (a.gravidade === "GRAVE" || a.gravidade === "MEDIA") {
    return {
      tipo: "CONFERIR",
      titulo: a.titulo,
      detalhe: a.detalhe,
      fonte: a.fonte,
    };
  }

  return null;
}

function classificarCertidao(c: CertidaoDoParticipante): AchadoClassificacao | null {
  const definicao = documentoHabilitacao(c.tipo);
  const nome = definicao?.nome ?? c.tipo;

  if (c.resultado === "CONSTA") {
    const trabalhista = c.tipo === "CNDT";
    return {
      tipo: "IRREGULARIDADE",
      titulo: `${nome}: consta débito`,
      detalhe: c.apontamento || "A certidão emitida na fonte oficial acusou registro. Confira o inteiro teor antes de decidir.",
      fonte: definicao?.chave === "CNDT" ? "TST — CNDT" : "Emissão na fonte",
      baseLegal: trabalhista
        ? "Lei nº 14.133/2021, art. 68, V (regularidade trabalhista); CLT, art. 642-A"
        : "Lei nº 14.133/2021, art. 68 (regularidade fiscal)",
    };
  }

  if (c.resultado === "PENDENTE") {
    return {
      tipo: "CONFERIR",
      titulo: `${nome}: sem leitura conclusiva`,
      detalhe: "A certidão foi anexada mas ninguém declarou o resultado. Confira o documento antes de decidir.",
      fonte: "Documento apresentado",
    };
  }

  return null;
}

export function classificarParticipante(params: {
  apontamentos: Apontamento[];
  dadosCadastrais: DadosCadastrais | null;
  /** Fontes que não responderam — não podem virar aprovação silenciosa. */
  fontesIndisponiveis: string[];
  leituraEdital: LeituraEdital | null;
  documentos: DocumentoDoParticipante[];
  certidoes: CertidaoDoParticipante[];
}): ClassificacaoParticipante {
  const achados: AchadoClassificacao[] = [];

  // ----- 1. situação cadastral -----
  const cadastro = situacaoCadastralImpede(params.dadosCadastrais);
  if (cadastro) achados.push(cadastro);

  // ----- 2. due diligence -----
  for (const a of params.apontamentos) {
    const achado = classificarApontamento(a);
    if (achado) achados.push(achado);
  }

  // ----- 3. certidões emitidas na fonte -----
  for (const c of params.certidoes) {
    const achado = classificarCertidao(c);
    if (achado) achados.push(achado);
  }

  // ----- 4. cobertura dos requisitos do edital -----
  const requisitos = params.leituraEdital?.requisitos ?? [];
  const apresentados = new Set(params.documentos.map((d) => d.tipo));
  const emitidas = new Set(params.certidoes.filter((c) => c.resultado !== "PENDENTE").map((c) => c.tipo));

  let atendidos = 0;
  let semConferenciaAutomatica = 0;

  for (const r of requisitos) {
    const chave = r.chaveReconhecida;

    // Exigência que a leitura não reconheceu no catálogo: a plataforma não
    // tem como dizer se foi atendida. Vai para conferência humana.
    if (!chave) {
      semConferenciaAutomatica++;
      achados.push({
        tipo: "CONFERIR",
        titulo: "Exigência do edital sem correspondência automática",
        detalhe: `${r.descricao} — confira manualmente se o participante atendeu (categoria: ${ROTULO_CATEGORIA(r.categoria)}).`,
        fonte: "Edital",
      });
      continue;
    }

    const definicao = documentoHabilitacao(chave);
    const nome = definicao?.nome ?? chave;

    if (apresentados.has(chave) || emitidas.has(chave)) {
      atendidos++;
      continue;
    }

    // A declaração que a própria plataforma gera não é pendência do
    // participante perante a prefeitura: ela vem no envelope do licitante.
    if (definicao?.resolucao === "GERADO") {
      achados.push({
        tipo: "PENDENCIA",
        titulo: `Falta: ${nome}`,
        detalhe: "Declaração padronizada exigida pelo edital e ainda não apresentada por este participante.",
        fonte: "Edital",
      });
      continue;
    }

    achados.push({
      tipo: "PENDENCIA",
      titulo: `Falta: ${nome}`,
      detalhe: `O edital exige este documento (${ROTULO_CATEGORIA(r.categoria)}) e ele não foi apresentado nem emitido na fonte.`,
      fonte: "Edital",
      baseLegal: definicao ? CATEGORIAS_HABILITACAO[definicao.categoria].fundamento : undefined,
    });
  }

  // ----- 5. autenticidade dos documentos apresentados -----
  for (const d of params.documentos) {
    const nome = documentoHabilitacao(d.tipo)?.nome ?? d.tipo;

    if (d.autenticidadeResultado === "DIVERGE") {
      achados.push({
        tipo: "IMPEDIMENTO",
        titulo: `${nome}: diverge da fonte oficial`,
        detalhe:
          "O documento apresentado não confere com o que o órgão emissor responde hoje. Divergência em documento " +
          "de habilitação é matéria grave e precisa ser apurada antes de qualquer decisão.",
        fonte: "Conferência de autenticidade",
        baseLegal: "Lei nº 14.133/2021, art. 155, VIII (apresentação de documentação falsa)",
      });
      continue;
    }

    if (!d.autenticidadeConferida) {
      achados.push({
        tipo: "CONFERIR",
        titulo: `${nome}: autenticidade não conferida`,
        detalhe: "O documento foi anexado, mas ainda não foi comparado com a fonte oficial.",
        fonte: "Documento apresentado",
      });
    }

    // Conferência automática do conteúdo: titularidade, validade e resultado
    // da certidão. Divergência aqui é objetiva — documento vencido, em nome
    // de outra empresa, ou certidão positiva.
    for (const c of d.conferencia ?? []) {
      if (c.tipo === "DIVERGENCIA") {
        achados.push({
          tipo: "IRREGULARIDADE",
          titulo: `${nome}: ${c.titulo}`,
          detalhe: c.detalhe,
          fonte: "Leitura automática do documento",
          baseLegal: "Lei nº 14.133/2021, art. 63 e art. 68 (documentação de habilitação)",
        });
      } else if (c.tipo === "ALERTA") {
        achados.push({
          tipo: "CONFERIR",
          titulo: `${nome}: ${c.titulo}`,
          detalhe: c.detalhe,
          fonte: "Leitura automática do documento",
        });
      }
    }
  }

  // ----- 6. fontes que não responderam -----
  for (const f of params.fontesIndisponiveis) {
    achados.push({
      tipo: "CONFERIR",
      titulo: `Fonte não consultada: ${f}`,
      detalhe:
        "Esta fonte não respondeu na verificação automática. A ausência de apontamento aqui NÃO significa que " +
        "nada conste — confira manualmente antes de considerar este ponto atendido.",
      fonte: f,
    });
  }

  if (!params.leituraEdital) {
    achados.push({
      tipo: "CONFERIR",
      titulo: "Edital não lido automaticamente",
      detalhe:
        "Sem os requisitos extraídos do edital, a plataforma não tem como conferir se a documentação apresentada " +
        "está completa. Anexe o PDF do edital no certame para a conferência automática.",
      fonte: "Certame",
    });
  }

  // ----- veredito -----
  const porte = `${params.dadosCadastrais?.porte ?? ""}`.toUpperCase();
  const microempresa =
    porte.includes("ME") ||
    porte.includes("MICRO") ||
    porte.includes("EPP") ||
    porte.includes("PEQUENO") ||
    Boolean(params.dadosCadastrais?.optanteMei);

  const temImpedimento = achados.some((a) => a.tipo === "IMPEDIMENTO");
  const irregularidades = achados.filter((a) => a.tipo === "IRREGULARIDADE");
  const temPendencia = achados.some((a) => a.tipo === "PENDENCIA");
  const temConferir = achados.some((a) => a.tipo === "CONFERIR");

  if (microempresa && irregularidades.length > 0) {
    achados.push({
      tipo: "CONFERIR",
      titulo: "Microempresa/EPP: prazo para regularizar",
      detalhe:
        "A empresa consta como ME/EPP na Receita. Irregularidade fiscal não impede a habilitação de imediato: " +
        "havendo restrição, é assegurado o prazo para regularização após a declaração de vencedora.",
      fonte: "Receita Federal",
      baseLegal: "LC nº 123/2006, arts. 42 e 43",
    });
  }

  let recomendacao: Recomendacao;
  let resumo: string;

  if (temImpedimento) {
    recomendacao = "INABILITAR";
    resumo =
      "Há impedimento objetivo para contratar com a Administração. A comissão deve apreciar o item antes de " +
      "qualquer decisão, mas o achado é de natureza impeditiva, não sanável por diligência.";
  } else if (irregularidades.length > 0 && !microempresa) {
    recomendacao = "INABILITAR";
    resumo =
      "Há irregularidade fiscal ou trabalhista em fonte oficial, e a empresa não consta como ME/EPP — logo, não " +
      "se aplica o prazo de regularização posterior da LC nº 123/2006.";
  } else if (irregularidades.length > 0) {
    recomendacao = "DILIGENCIA";
    resumo =
      "Há irregularidade fiscal, mas a empresa consta como ME/EPP: cabe assegurar o prazo de regularização " +
      "antes de inabilitar (LC nº 123/2006, arts. 42 e 43).";
  } else if (temPendencia) {
    recomendacao = "DILIGENCIA";
    resumo = "Falta documentação exigida pelo edital. Cabe diligência antes de decidir.";
  } else if (temConferir) {
    recomendacao = "DILIGENCIA";
    resumo =
      "Nada impeditivo foi encontrado nas fontes consultadas, mas há itens que a verificação automática não " +
      "resolve sozinha e precisam de conferência da comissão.";
  } else {
    recomendacao = "HABILITAR";
    resumo =
      "Nenhum impedimento, irregularidade ou pendência documental foi encontrado nas fontes consultadas e nos " +
      "requisitos lidos do edital.";
  }

  return {
    recomendacao,
    resumo,
    achados,
    microempresa,
    requisitosDoEdital: requisitos.length,
    requisitosAtendidos: atendidos,
    requisitosSemConferenciaAutomatica: semConferenciaAutomatica,
  };
}
