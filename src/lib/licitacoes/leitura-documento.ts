/**
 * Leitura e conferência automática de um documento de habilitação.
 *
 * A IA lê o arquivo (PDF ou imagem, em base64 — mesmo mecanismo do resto da
 * plataforma, porque não há extração local de texto de PDF aqui) e devolve só
 * o que ESTÁ ESCRITO: titular, documento do titular, órgão, datas e o
 * resultado. Ela não julga se o participante está habilitado — quem confronta
 * o que foi lido com a regra do edital é código, abaixo, com regra explícita.
 *
 * A divisão é deliberada: extrair dado de um documento é tarefa para IA;
 * decidir habilitação a partir dele, não. Se a IA errar a leitura, o erro
 * aparece como divergência a conferir, não como decisão tomada.
 */
import { perguntarJson, iaConfigurada, type BlocoConteudo } from "@/lib/ia/claude";
import { DOCUMENTOS_HABILITACAO } from "./requisitos";
import type { RegraDocumento } from "./regras-documento";
import { somenteNumeros } from "@/lib/validacao";

export type ResultadoDocumento = "NADA_CONSTA" | "CONSTA" | "NAO_SE_APLICA" | "INDETERMINADO";

export type LeituraDocumento = {
  /** Chave do catálogo que a IA reconheceu, ou null. */
  tipoIdentificado: string | null;
  titular: string | null;
  /** CNPJ/CPF lido no documento, só dígitos. */
  documentoTitular: string | null;
  orgaoEmissor: string | null;
  /** AAAA-MM-DD, como estiver no documento. */
  emitidaEm: string | null;
  validaAte: string | null;
  resultado: ResultadoDocumento;
  observacao: string | null;
};

export type AchadoDocumento = {
  /** OK não some da tela: é o registro de que aquilo foi conferido. */
  tipo: "OK" | "ALERTA" | "DIVERGENCIA";
  titulo: string;
  detalhe: string;
};

const CATALOGO_TEXTO = DOCUMENTOS_HABILITACAO.map((d) => `${d.chave}: ${d.nome}`).join("\n");

const INSTRUCAO = `Você lê documentos de habilitação apresentados em licitações públicas brasileiras — certidões, contrato social, atestados, balanços, declarações.

Extraia SOMENTE o que está escrito no documento recebido:
- o tipo do documento, reconhecido contra este catálogo (use a chave exata, ou null se não corresponder a nenhum):

${CATALOGO_TEXTO}

- o titular (nome ou razão social a quem o documento se refere);
- o CPF ou CNPJ do titular, só os dígitos;
- o órgão que emitiu;
- a data de emissão e a data de validade, no formato AAAA-MM-DD;
- o resultado, quando for certidão: "NADA_CONSTA" se a certidão é negativa/sem pendências, "CONSTA" se aponta débito, processo ou registro, "NAO_SE_APLICA" se o documento não é certidão, "INDETERMINADO" se não der para afirmar.

REGRAS QUE NÃO PODEM SER QUEBRADAS:
1. Só responda o que está no documento. Campo que não estiver legível ou não existir vira null — nunca deduza, nunca complete com o que "costuma ser".
2. Não decida se o participante está habilitado. Isso não é tarefa sua: devolva os dados lidos e pronto.
3. Em dúvida entre "NADA_CONSTA" e "CONSTA", responda "INDETERMINADO" e explique na observação. Dizer que uma certidão é negativa quando não é seria o pior erro possível aqui.
4. "Certidão positiva com efeito de negativa" é NADA_CONSTA para fins de regularidade — mas diga isso na observação.

Responda SOMENTE com um objeto JSON, sem texto antes ou depois:
{
  "tipoIdentificado": "CHAVE_DO_CATALOGO" ou null,
  "titular": "..." ou null,
  "documentoTitular": "somente digitos" ou null,
  "orgaoEmissor": "..." ou null,
  "emitidaEm": "AAAA-MM-DD" ou null,
  "validaAte": "AAAA-MM-DD" ou null,
  "resultado": "NADA_CONSTA|CONSTA|NAO_SE_APLICA|INDETERMINADO",
  "observacao": "o que precisa ser dito sobre a leitura, ou null"
}`;

function bloco(bytes: Buffer, tipo: string): BlocoConteudo | null {
  if (tipo === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") } };
  }
  if (tipo.startsWith("image/")) {
    return { type: "image", source: { type: "base64", media_type: tipo, data: bytes.toString("base64") } };
  }
  return null;
}

export async function lerDocumentoDeHabilitacao(params: {
  arquivo: Buffer;
  arquivoTipo: string;
  contexto?: { solucao?: string; contaId?: string | null; referencia?: string };
}): Promise<{ ok: true; leitura: LeituraDocumento } | { ok: false; erro: string }> {
  if (!iaConfigurada()) return { ok: false, erro: "Leitura automática indisponível: IA não configurada." };

  const conteudo = bloco(params.arquivo, params.arquivoTipo);
  if (!conteudo) return { ok: false, erro: "Formato não lido automaticamente (aceita PDF ou imagem)." };

  const resposta = await perguntarJson<Record<string, unknown>>({
    instrucao: INSTRUCAO,
    conteudo: [conteudo],
    maxTokens: 2000,
    contexto: params.contexto,
  });

  if (!resposta.ok) return { ok: false, erro: resposta.erro };

  const d = resposta.dados;
  const chaves = new Set(DOCUMENTOS_HABILITACAO.map((x) => x.chave));
  const resultados: ResultadoDocumento[] = ["NADA_CONSTA", "CONSTA", "NAO_SE_APLICA", "INDETERMINADO"];

  const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  return {
    ok: true,
    leitura: {
      tipoIdentificado: typeof d.tipoIdentificado === "string" && chaves.has(d.tipoIdentificado) ? d.tipoIdentificado : null,
      titular: texto(d.titular),
      documentoTitular: texto(d.documentoTitular) ? somenteNumeros(String(d.documentoTitular)) || null : null,
      orgaoEmissor: texto(d.orgaoEmissor),
      emitidaEm: texto(d.emitidaEm),
      validaAte: texto(d.validaAte),
      resultado: resultados.includes(d.resultado as ResultadoDocumento) ? (d.resultado as ResultadoDocumento) : "INDETERMINADO",
      observacao: texto(d.observacao),
    },
  };
}

function data(valor: string | null): Date | null {
  if (!valor) return null;
  const d = new Date(`${valor}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Confronta o que foi lido com a regra do edital. Tudo aqui é comparação
 * explícita — nenhuma decisão fica a cargo da IA.
 */
export function conferirDocumento(params: {
  leitura: LeituraDocumento;
  /** Tipo que a prefeitura declarou ao anexar. */
  tipoDeclarado: string;
  regra: RegraDocumento | null;
  /** CNPJ do participante, só dígitos. */
  documentoDoParticipante: string;
  /** Data em que a habilitação é julgada — em regra, a da sessão. */
  referencia: Date;
}): AchadoDocumento[] {
  const achados: AchadoDocumento[] = [];
  const { leitura, regra } = params;

  // ----- o documento é o que diz ser? -----
  if (leitura.tipoIdentificado && params.tipoDeclarado !== "OUTRO" && leitura.tipoIdentificado !== params.tipoDeclarado) {
    achados.push({
      tipo: "DIVERGENCIA",
      titulo: "Documento anexado não corresponde ao tipo informado",
      detalhe: `Foi anexado como "${params.tipoDeclarado}", mas a leitura identificou "${leitura.tipoIdentificado}". Confira se o arquivo certo foi enviado.`,
    });
  }

  // ----- está em nome do participante? -----
  const doParticipante = somenteNumeros(params.documentoDoParticipante);
  if (leitura.documentoTitular && doParticipante) {
    if (leitura.documentoTitular !== doParticipante) {
      achados.push({
        tipo: "DIVERGENCIA",
        titulo: "Documento está em nome de outra pessoa jurídica",
        detalhe: `O documento traz o CNPJ/CPF ${leitura.documentoTitular}, e o participante é ${doParticipante}. Documento de habilitação tem que ser do próprio licitante.`,
      });
    } else {
      achados.push({ tipo: "OK", titulo: "Titularidade confere", detalhe: `Documento emitido para ${doParticipante}.` });
    }
  } else if (regra?.exigeTitularidade) {
    achados.push({
      tipo: "ALERTA",
      titulo: "Titularidade não pôde ser conferida",
      detalhe: "A leitura não encontrou o CNPJ/CPF no documento. Confira manualmente se ele é do próprio participante.",
    });
  }

  // ----- está válido na data de referência? -----
  const validade = data(leitura.validaAte);
  if (validade) {
    if (validade < params.referencia) {
      achados.push({
        tipo: "DIVERGENCIA",
        titulo: "Documento vencido",
        detalhe: `A validade terminou em ${validade.toLocaleDateString("pt-BR")}, antes da data de referência (${params.referencia.toLocaleDateString("pt-BR")}).`,
      });
    } else {
      achados.push({
        tipo: "OK",
        titulo: "Dentro da validade",
        detalhe: `Válido até ${validade.toLocaleDateString("pt-BR")}.`,
      });
    }
  } else if (regra?.validadeDias) {
    const emissao = data(leitura.emitidaEm);
    if (emissao) {
      const limite = new Date(emissao.getTime() + regra.validadeDias * 86400000);
      if (limite < params.referencia) {
        achados.push({
          tipo: "DIVERGENCIA",
          titulo: "Documento provavelmente vencido",
          detalhe:
            `O documento não traz data de validade. Contando os ${regra.validadeDias} dias usuais desta certidão a ` +
            `partir da emissão (${emissao.toLocaleDateString("pt-BR")}), o prazo terminou em ${limite.toLocaleDateString("pt-BR")}. ` +
            "Confira o prazo que o edital exige.",
        });
      }
    } else {
      achados.push({
        tipo: "ALERTA",
        titulo: "Sem data de emissão nem de validade legíveis",
        detalhe: "Não foi possível conferir se o documento ainda vale. Confira manualmente.",
      });
    }
  }

  // ----- certidão negativa realmente negativa? -----
  if (regra?.exigeNadaConsta) {
    if (leitura.resultado === "CONSTA") {
      achados.push({
        tipo: "DIVERGENCIA",
        titulo: "Certidão positiva",
        detalhe: leitura.observacao || "A certidão aponta débito ou registro. Isso é irregularidade para fins de habilitação.",
      });
    } else if (leitura.resultado === "NADA_CONSTA") {
      achados.push({ tipo: "OK", titulo: "Certidão negativa", detalhe: leitura.observacao || "Nada consta." });
    } else {
      achados.push({
        tipo: "ALERTA",
        titulo: "Resultado da certidão não é conclusivo",
        detalhe: leitura.observacao || "A leitura não conseguiu afirmar se a certidão é negativa. Confira o inteiro teor.",
      });
    }
  }

  if (regra?.descricaoNoEdital) {
    achados.push({
      tipo: "ALERTA",
      titulo: "Condição do edital a conferir",
      detalhe: `O edital exige: "${regra.descricaoNoEdital}". A conferência automática cobre titularidade, validade e resultado — o atendimento ao que o edital descreve precisa do olhar da comissão.`,
    });
  }

  return achados;
}
