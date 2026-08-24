/**
 * Infosimples — consultas e emissão de certidões em órgãos públicos.
 *
 * POR QUE ISTO EXISTE, DEPOIS DE EU TER DITO QUE NÃO DAVA
 *
 * As bases públicas realmente recusam acesso direto: BNMP exige autenticação,
 * a Polícia Federal bloqueia robô, os tribunais usam captcha. O que eu não
 * havia considerado é que existe um mercado inteiro de empresas que fazem essa
 * ponte como serviço contratado, com CNPJ e responsabilidade própria — e a
 * preços baixos.
 *
 * A Infosimples cobre justamente o buraco: certidões de TJ, TRF e TRT, BNMP,
 * improbidade do CNJ, antecedentes da Polícia Federal, CNDT, CND federal,
 * certidões estaduais e protesto. Contratada, ela transforma "exija a certidão
 * da parte" em "o sistema emite a certidão".
 *
 * O QUE NÃO MUDA: a certidão emitida continua sendo o documento que sustenta a
 * operação, e continua sendo guardada com data e código de autenticidade. O que
 * muda é quem vai buscá-la.
 *
 * SOBRE OS CAMINHOS DOS SERVIÇOS: cada consulta tem um endereço próprio, e a
 * lista definitiva vem com a documentação da conta contratada. Eles ficam
 * reunidos em SERVICOS abaixo para que um ajuste seja de uma linha, num lugar
 * só — nunca espalhado pelo sistema.
 */
import type { ResultadoFonte } from "../tipos";
import { somenteNumeros } from "@/lib/validacao";

const BASE_PADRAO = "https://api.infosimples.com/api/v2/consultas";
const TEMPO_LIMITE = 60_000; // consultas em tribunal levam dezenas de segundos

export function infosimplesConfigurado(): boolean {
  return Boolean((process.env.INFOSIMPLES_TOKEN ?? "").trim());
}

function base(): string {
  return (process.env.INFOSIMPLES_URL ?? "").trim() || BASE_PADRAO;
}

/**
 * Caminho de cada consulta, a partir da chave de certidão do nosso catálogo.
 *
 * `{uf}` é trocado pela sigla do estado em minúsculas. Serviço sem caminho aqui
 * simplesmente não é emitido automaticamente — o sistema volta a pedir a
 * certidão à parte, como antes.
 */
const SERVICOS: Record<string, { caminho: string; parametros: "CPF" | "CNPJ" | "DOCUMENTO"; observacao?: string }> = {
  BNMP_MANDADO: {
    caminho: "cnj/mandados-prisao",
    parametros: "CPF",
    observacao: "Retorna mandados com situação 'aguardando cumprimento'.",
  },
  IMPROBIDADE_CNJ: {
    caminho: "cnj/improbidade",
    parametros: "DOCUMENTO",
  },
  ANTECEDENTES_PF: {
    caminho: "antecedentes-criminais/pf/emitir",
    parametros: "CPF",
    observacao: "Exige nome completo e nome da mãe além do CPF.",
  },
  CNDT: {
    caminho: "tst/cndt",
    parametros: "DOCUMENTO",
  },
  CND_FEDERAL: {
    caminho: "receita-federal/pgfn-certidao",
    parametros: "DOCUMENTO",
  },
  PROTESTO: {
    caminho: "ieptb/protestos",
    parametros: "DOCUMENTO",
  },
  DIVIDA_ATIVA_ESTADUAL: {
    caminho: "sefaz/{uf}/certidao-debitos",
    parametros: "DOCUMENTO",
  },
  DISTRIBUICAO_CIVEL: {
    caminho: "tribunal/tj{uf}/certidao-civel",
    parametros: "DOCUMENTO",
    observacao: "Em vários tribunais a emissão tem duas etapas: pedido e depois retirada do PDF.",
  },
  DISTRIBUICAO_CRIMINAL_ESTADUAL: {
    caminho: "tribunal/tj{uf}/certidao-criminal",
    parametros: "DOCUMENTO",
  },
  DISTRIBUICAO_CRIMINAL_FEDERAL: {
    caminho: "tribunal/trf/certidao-unificada",
    parametros: "DOCUMENTO",
  },
};

export function temEmissaoAutomatica(chaveCertidao: string): boolean {
  return infosimplesConfigurado() && chaveCertidao in SERVICOS;
}

export type RespostaInfosimples = {
  code: number;
  code_message?: string;
  header?: { price?: string; requested_at?: string; elapsed_time_in_milliseconds?: number };
  data_count?: number;
  data?: Array<Record<string, unknown>>;
  errors?: string[];
  /** Comprovantes em PDF/HTML gerados pela consulta — é o que guardamos. */
  site_receipts?: string[];
};

/**
 * Chama uma consulta e devolve a resposta crua.
 *
 * Não interpreta nada aqui de propósito: cada consulta tem um formato de dados
 * diferente, e a leitura fica em quem chamou.
 */
export async function consultarInfosimples(
  caminho: string,
  parametros: Record<string, string>
): Promise<{ ok: true; resposta: RespostaInfosimples } | { ok: false; erro: string }> {
  const token = (process.env.INFOSIMPLES_TOKEN ?? "").trim();
  if (!token) return { ok: false, erro: "Infosimples não configurado (INFOSIMPLES_TOKEN)." };

  try {
    const resposta = await fetch(`${base()}/${caminho}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token, timeout: 300, ...parametros }),
      signal: AbortSignal.timeout(TEMPO_LIMITE),
    });

    const corpo = (await resposta.json().catch(() => null)) as RespostaInfosimples | null;

    if (!corpo) return { ok: false, erro: `Resposta ilegível (HTTP ${resposta.status}).` };

    // A Infosimples devolve HTTP 200 mesmo em erro de negócio; quem manda é o
    // campo `code`. Tratar pelo status HTTP deixaria erro passar como sucesso.
    if (corpo.code !== 200) {
      const detalhe = corpo.errors?.length ? ` ${corpo.errors.join("; ")}` : "";
      return { ok: false, erro: `${corpo.code_message ?? `Código ${corpo.code}`}.${detalhe}` };
    }

    return { ok: true, resposta: corpo };
  } catch (erro) {
    return { ok: false, erro: (erro as Error).message };
  }
}

// ---------------------------------------------------------------------
// Emissão de certidão
// ---------------------------------------------------------------------

export type CertidaoEmitida = {
  /** NADA_CONSTA | CONSTA */
  resultado: "NADA_CONSTA" | "CONSTA";
  /** Classificação do apontamento, quando consta. */
  natureza: "NENHUMA" | "PROCESSO_EM_CURSO" | "MANDADO_ABERTO" | "OUTRO";
  apontamento: string | null;
  numero: string | null;
  /** Endereço do comprovante gerado pela consulta. */
  comprovante: string | null;
  /** Resposta completa, guardada como prova do que foi consultado. */
  bruto: unknown;
  custo: string | null;
};

/**
 * Emite (ou consulta) uma certidão pela Infosimples.
 *
 * A leitura do resultado é deliberadamente conservadora: só marca NADA_CONSTA
 * quando a resposta vem vazia de forma inequívoca. Qualquer registro devolvido
 * vira CONSTA, para conferência humana. Errar para o lado do alerta é barato;
 * errar para o lado do "nada consta" é o erro que quebra a operação.
 */
export async function emitirCertidao(params: {
  chaveCertidao: string;
  documento: string;
  nome: string;
  nomeMae?: string | null;
  uf?: string | null;
}): Promise<{ ok: true; certidao: CertidaoEmitida } | { ok: false; erro: string }> {
  const servico = SERVICOS[params.chaveCertidao];
  if (!servico) return { ok: false, erro: "Esta certidão não tem emissão automática configurada." };

  const uf = (params.uf ?? "").toLowerCase();
  if (servico.caminho.includes("{uf}") && !uf) {
    return { ok: false, erro: "Esta certidão depende do estado da parte, que não está cadastrado." };
  }

  const documento = somenteNumeros(params.documento);
  const parametros: Record<string, string> = {};

  if (servico.parametros === "CPF") {
    if (documento.length !== 11) return { ok: false, erro: "Esta consulta exige CPF." };
    parametros.cpf = documento;
    parametros.nome = params.nome;
    if (params.nomeMae) parametros.nome_mae = params.nomeMae;
  } else if (servico.parametros === "CNPJ") {
    if (documento.length !== 14) return { ok: false, erro: "Esta consulta exige CNPJ." };
    parametros.cnpj = documento;
  } else {
    // Aceita os dois; o nome do parâmetro muda conforme o tamanho.
    if (documento.length === 11) parametros.cpf = documento;
    else if (documento.length === 14) parametros.cnpj = documento;
    else return { ok: false, erro: "Documento em formato não aceito por esta consulta." };
  }

  const resultado = await consultarInfosimples(servico.caminho.replace("{uf}", uf), parametros);
  if (!resultado.ok) return resultado;

  const { resposta } = resultado;
  const registros = Array.isArray(resposta.data) ? resposta.data : [];

  // ----- leitura conservadora -----
  const temApontamento = registros.some((r) => {
    // Muitas consultas devolvem um objeto com "nada consta" descrito em texto.
    const texto = JSON.stringify(r).toLowerCase();
    if (/nada consta|não constam|nao constam|negativa|sem registro|não foram encontrad/.test(texto)) return false;
    // Lista de processos, mandados ou protestos devolvida = há o que olhar.
    return Object.values(r).some((v) => Array.isArray(v) && v.length > 0) || Object.keys(r).length > 2;
  });

  const ehMandado = params.chaveCertidao === "BNMP_MANDADO";

  return {
    ok: true,
    certidao: {
      resultado: temApontamento ? "CONSTA" : "NADA_CONSTA",
      natureza: temApontamento ? (ehMandado ? "MANDADO_ABERTO" : "PROCESSO_EM_CURSO") : "NENHUMA",
      apontamento: temApontamento
        ? `Consulta automática retornou ${registros.length} registro(s). Confira o comprovante antes de concluir.`
        : null,
      numero: extrairNumero(registros),
      comprovante: resposta.site_receipts?.[0] ?? null,
      bruto: resposta,
      custo: resposta.header?.price ?? null,
    },
  };
}

/** Procura um número de certidão ou protocolo na resposta, sem inventar. */
function extrairNumero(registros: Array<Record<string, unknown>>): string | null {
  for (const registro of registros) {
    for (const [chave, valor] of Object.entries(registro)) {
      if (typeof valor !== "string" || !valor.trim()) continue;
      if (/certidao|certidão|protocolo|numero|número|codigo|código|autentic/i.test(chave)) {
        return valor.trim();
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------
// Uso dentro da auditoria
// ---------------------------------------------------------------------

/** Consulta o BNMP durante a auditoria, quando a Infosimples está contratada. */
export async function consultarMandadosPrisao(cpf: string, nome: string): Promise<ResultadoFonte> {
  if (!infosimplesConfigurado()) {
    return {
      fonte: "BNMP",
      status: "INDISPONIVEL",
      resumo: "Mandados de prisão não verificados: consulta automática não contratada.",
      apontamentos: [],
    };
  }

  const resultado = await emitirCertidao({ chaveCertidao: "BNMP_MANDADO", documento: cpf, nome });

  if (!resultado.ok) {
    return {
      fonte: "BNMP",
      status: "ERRO",
      resumo: "Consulta ao banco de mandados de prisão não concluída.",
      erro: resultado.erro,
      apontamentos: [],
    };
  }

  const { certidao } = resultado;

  if (certidao.resultado === "NADA_CONSTA") {
    return {
      fonte: "BNMP",
      status: "CONCLUIDA",
      resumo: "Nenhum mandado de prisão em aberto.",
      resultado: certidao.bruto,
      apontamentos: [],
    };
  }

  return {
    fonte: "BNMP",
    status: "CONCLUIDA",
    resumo: "Há registro no banco nacional de mandados de prisão.",
    resultado: certidao.bruto,
    apontamentos: [
      {
        gravidade: "GRAVE",
        eixo: "IDONEIDADE",
        titulo: "Registro no banco nacional de mandados de prisão",
        detalhe:
          "A consulta automática encontrou registro. Confira o comprovante e confirme a identidade — pode " +
          "haver homonímia. Confirmando-se, não assine contrato, procuração ou escritura: além do risco " +
          "prático, transferência de patrimônio por quem está foragido levanta suspeita de ocultação de bens.",
        fonte: "CNJ — Banco Nacional de Mandados de Prisão",
      },
    ],
  };
}
