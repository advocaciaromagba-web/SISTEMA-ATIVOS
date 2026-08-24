/**
 * Infosimples — emissão de certidões e consultas em órgãos públicos.
 *
 * POR QUE ISTO EXISTE, DEPOIS DE EU TER DITO QUE NÃO DAVA
 *
 * As bases públicas realmente recusam acesso direto: o BNMP exige autenticação,
 * a Polícia Federal bloqueia robô, os tribunais usam captcha. O que faltava
 * considerar é que existe um mercado de empresas que fazem essa ponte como
 * serviço contratado, com CNPJ e responsabilidade própria — e barato.
 *
 * Contratada, a Infosimples transforma "exija a certidão da parte" em "o
 * sistema emite a certidão". O que não muda: a certidão emitida continua sendo
 * o documento que sustenta a operação, guardada com data e comprovante.
 *
 * CONTRATO DA API (levantado do catálogo público e do SDK oficial em Node):
 *   POST https://api.infosimples.com/api/v2/consultas/<caminho>
 *   corpo JSON com { token, timeout, ...parâmetros da consulta }
 *   resposta sempre HTTP 200; quem manda é o campo `code` (200 = sucesso)
 *   `site_receipts` traz os comprovantes gerados — é o que guardamos como prova
 */
import type { ResultadoFonte } from "../tipos";
import { somenteNumeros } from "@/lib/validacao";
import { servicoPara, type ServicoInfosimples } from "./infosimples-servicos";

const BASE_PADRAO = "https://api.infosimples.com/api/v2/consultas";

/** Consulta em tribunal demora: o próprio serviço aceita esperar até 300s. */
const TEMPO_LIMITE_HTTP = 180_000;
const TIMEOUT_SERVICO = 300;

export function infosimplesConfigurado(): boolean {
  return Boolean((process.env.INFOSIMPLES_TOKEN ?? "").trim());
}

function base(): string {
  return (process.env.INFOSIMPLES_URL ?? "").trim() || BASE_PADRAO;
}

export function temEmissaoAutomatica(chaveCertidao: string, uf: string | null = null): boolean {
  return infosimplesConfigurado() && servicoPara(chaveCertidao, uf) != null;
}

// ---------------------------------------------------------------------
// Chamada crua
// ---------------------------------------------------------------------

export type RespostaInfosimples = {
  code: number;
  code_message?: string;
  header?: { price?: string; requested_at?: string; elapsed_time_in_milliseconds?: number };
  data_count?: number;
  data?: Array<Record<string, unknown>>;
  errors?: string[];
  site_receipts?: string[];
};

export async function chamar(
  caminho: string,
  parametros: Record<string, string>
): Promise<{ ok: true; resposta: RespostaInfosimples } | { ok: false; erro: string; codigo?: number }> {
  const token = (process.env.INFOSIMPLES_TOKEN ?? "").trim();
  if (!token) return { ok: false, erro: "Infosimples não configurado (INFOSIMPLES_TOKEN)." };

  try {
    const resposta = await fetch(`${base()}/${caminho}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token, timeout: TIMEOUT_SERVICO, ...parametros }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_HTTP),
    });

    const corpo = (await resposta.json().catch(() => null)) as RespostaInfosimples | null;
    if (!corpo) return { ok: false, erro: `Resposta ilegível (HTTP ${resposta.status}).` };

    // A API responde HTTP 200 mesmo em erro de negócio; quem manda é o `code`.
    // Tratar pelo status HTTP deixaria erro passar por sucesso.
    if (corpo.code !== 200) {
      const detalhe = corpo.errors?.length ? ` ${corpo.errors.join("; ")}` : "";
      const mensagem = corpo.code_message ?? `código ${corpo.code}`;

      // Os dois erros de conta valem uma mensagem própria: são os que o
      // operador consegue resolver sozinho, e a mensagem crua não diz como.
      const explicacao =
        corpo.code === 601
          ? " Confira INFOSIMPLES_TOKEN no arquivo .env."
          : corpo.code === 602
            ? " A conta da Infosimples está sem saldo."
            : "";

      return { ok: false, codigo: corpo.code, erro: `${mensagem}.${detalhe}${explicacao}`.trim() };
    }

    return { ok: true, resposta: corpo };
  } catch (erro) {
    return { ok: false, erro: (erro as Error).message };
  }
}

// ---------------------------------------------------------------------
// Emissão de certidão
// ---------------------------------------------------------------------

export type DadosDaParte = {
  documento: string;
  nome: string;
  nomeMae?: string | null;
  dataNascimento?: Date | null;
  uf?: string | null;
};

export type CertidaoEmitida = {
  resultado: "NADA_CONSTA" | "CONSTA";
  natureza: "NENHUMA" | "PROCESSO_EM_CURSO" | "MANDADO_ABERTO" | "OUTRO";
  apontamento: string | null;
  numero: string | null;
  comprovantes: string[];
  bruto: unknown;
  custo: string | null;
  /** Avisos sobre o alcance da consulta, vindos do serviço. */
  observacao: string | null;
};

/** Monta os parâmetros que o serviço espera, e recusa quando falta algo. */
function montarParametros(
  servico: ServicoInfosimples,
  parte: DadosDaParte
): { ok: true; parametros: Record<string, string> } | { ok: false; erro: string } {
  const documento = somenteNumeros(parte.documento);
  const parametros: Record<string, string> = {};

  if (documento.length === 11) {
    if (servico.aceita === "CNPJ") return { ok: false, erro: "Esta consulta só aceita CNPJ." };
    parametros.cpf = documento;
  } else if (documento.length === 14) {
    if (servico.aceita === "CPF") return { ok: false, erro: "Esta consulta só aceita CPF." };
    parametros.cnpj = documento;
  } else {
    return { ok: false, erro: "Documento em formato não aceito por esta consulta." };
  }

  // Serviços de tribunal usam o nome para compor a certidão.
  parametros.nome = parte.nome;

  if (servico.exigeNomeMae) {
    if (!parte.nomeMae) {
      return {
        ok: false,
        erro:
          "Esta certidão exige o nome da mãe, que não está no cadastro. Complete o cadastro da parte ou emita " +
          "pelo site do órgão.",
      };
    }
    parametros.nome_mae = parte.nomeMae;
  }

  if (servico.exigeDataNascimento) {
    if (!parte.dataNascimento) {
      return {
        ok: false,
        erro:
          "Esta certidão exige a data de nascimento, que não está no cadastro. Complete o cadastro da parte ou " +
          "emita pelo site do órgão.",
      };
    }
    const d = parte.dataNascimento;
    parametros.data_nascimento = `${String(d.getUTCDate()).padStart(2, "0")}/${String(
      d.getUTCMonth() + 1
    ).padStart(2, "0")}/${d.getUTCFullYear()}`;
  }

  return { ok: true, parametros };
}

/**
 * Decide se a resposta significa "nada consta" ou "há o que olhar".
 *
 * A leitura é deliberadamente conservadora: só conclui NADA_CONSTA quando a
 * resposta diz isso de forma inequívoca ou vem vazia. Qualquer registro
 * devolvido vira CONSTA, para conferência humana. Errar para o lado do alerta
 * custa cinco minutos; errar para o lado do "nada consta" quebra a operação.
 */
function interpretar(registros: Array<Record<string, unknown>>): { consta: boolean; motivo: string | null } {
  if (registros.length === 0) return { consta: false, motivo: null };

  const texto = JSON.stringify(registros).toLowerCase();

  const dizNadaConsta =
    /nada\s*consta|n[aã]o\s*constam?|nenhum\s*(registro|processo|mandado|protesto)|sem\s*registro|negativa|n[aã]o\s*(foram\s*)?encontrad/.test(
      texto
    );

  // Listas preenchidas dentro dos registros são o sinal mais direto de que há
  // algo — e valem mais que a frase, porque muita certidão positiva também
  // contém a palavra "negativa" no cabeçalho do formulário.
  const temListaPreenchida = registros.some((r) =>
    Object.values(r).some((v) => Array.isArray(v) && v.length > 0)
  );

  if (temListaPreenchida) {
    return { consta: true, motivo: "A consulta devolveu registros." };
  }

  if (dizNadaConsta) return { consta: false, motivo: null };

  // Resposta com conteúdo, sem lista e sem dizer que nada consta: manda para
  // conferência em vez de decidir sozinho.
  const temConteudo = registros.some((r) => Object.keys(r).length > 2);
  return temConteudo
    ? { consta: true, motivo: "A consulta devolveu conteúdo que o sistema não soube classificar sozinho." }
    : { consta: false, motivo: null };
}

function extrairNumero(registros: Array<Record<string, unknown>>): string | null {
  for (const registro of registros) {
    for (const [chave, valor] of Object.entries(registro)) {
      if (typeof valor !== "string" || !valor.trim()) continue;
      if (/certid[aã]o|protocolo|n[uú]mero|c[oó]digo|autentic|controle/i.test(chave)) return valor.trim();
    }
  }
  return null;
}

/** Procura o número do pedido devolvido pela primeira etapa. */
function extrairNumeroPedido(registros: Array<Record<string, unknown>>, campo: string): string | null {
  for (const registro of registros) {
    const direto = registro[campo];
    if (typeof direto === "string" && direto.trim()) return direto.trim();

    for (const [chave, valor] of Object.entries(registro)) {
      if (typeof valor !== "string" || !valor.trim()) continue;
      if (/pedido|protocolo|solicita/i.test(chave)) return valor.trim();
    }
  }
  return null;
}

export async function emitirCertidao(params: {
  chaveCertidao: string;
  parte: DadosDaParte;
}): Promise<{ ok: true; certidao: CertidaoEmitida } | { ok: false; erro: string }> {
  const servico = servicoPara(params.chaveCertidao, params.parte.uf ?? null);

  if (!servico) {
    return {
      ok: false,
      erro:
        "Não há emissão automática para esta certidão neste estado. Use o link do órgão e registre o arquivo — " +
        "a cobertura varia de tribunal para tribunal.",
    };
  }

  const montagem = montarParametros(servico, params.parte);
  if (!montagem.ok) return montagem;

  // ----- primeira etapa -----
  const primeira = await chamar(servico.caminho, montagem.parametros);
  if (!primeira.ok) return { ok: false, erro: primeira.erro };

  let resposta = primeira.resposta;
  let registros = Array.isArray(resposta.data) ? resposta.data : [];
  const comprovantes = [...(resposta.site_receipts ?? [])];
  let custo = resposta.header?.price ?? null;

  // ----- segunda etapa, quando o tribunal emite por protocolo -----
  if (servico.segundaEtapa) {
    const numeroPedido = extrairNumeroPedido(registros, servico.segundaEtapa.campoNumero);

    if (!numeroPedido) {
      return {
        ok: false,
        erro:
          "O pedido foi registrado no tribunal, mas o número do protocolo não veio na resposta. " +
          "Consulte o painel da Infosimples e retire a certidão manualmente.",
      };
    }

    const segunda = await chamar(servico.segundaEtapa.caminho, {
      [servico.segundaEtapa.campoNumero]: numeroPedido,
    });

    if (!segunda.ok) {
      return {
        ok: false,
        erro:
          `Pedido nº ${numeroPedido} registrado no tribunal, mas a retirada falhou: ${segunda.erro} ` +
          "Vários tribunais levam alguns minutos para liberar o documento — tente de novo em instantes.",
      };
    }

    resposta = segunda.resposta;
    registros = Array.isArray(resposta.data) ? resposta.data : [];
    comprovantes.push(...(resposta.site_receipts ?? []));
    if (resposta.header?.price) custo = resposta.header.price;
  }

  const leitura = interpretar(registros);
  const ehMandado = params.chaveCertidao === "BNMP_MANDADO";

  return {
    ok: true,
    certidao: {
      resultado: leitura.consta ? "CONSTA" : "NADA_CONSTA",
      natureza: leitura.consta ? (ehMandado ? "MANDADO_ABERTO" : "PROCESSO_EM_CURSO") : "NENHUMA",
      apontamento: leitura.consta
        ? `${leitura.motivo ?? "A consulta devolveu registros."} Confira o comprovante e classifique o ` +
          "apontamento antes de concluir — a leitura automática não distingue processo em curso de condenação."
        : null,
      numero: extrairNumero(registros),
      comprovantes,
      bruto: resposta,
      custo,
      observacao: servico.observacao ?? null,
    },
  };
}

// ---------------------------------------------------------------------
// Uso dentro da auditoria
// ---------------------------------------------------------------------

/** Consulta o banco nacional de mandados de prisão durante a auditoria. */
export async function consultarMandadosPrisao(parte: DadosDaParte): Promise<ResultadoFonte> {
  if (!infosimplesConfigurado()) {
    return {
      fonte: "BNMP",
      status: "INDISPONIVEL",
      resumo: "Mandados de prisão não verificados: consulta automática não contratada.",
      apontamentos: [
        {
          gravidade: "MEDIA",
          eixo: "IDONEIDADE",
          titulo: "Mandados de prisão não verificados",
          detalhe:
            "O Banco Nacional de Mandados de Prisão não aceita consulta direta. Sem a consulta contratada, " +
            "exija da parte o comprovante emitido no portal do CNJ.",
          fonte: "CNJ",
        },
      ],
    };
  }

  if (somenteNumeros(parte.documento).length !== 11) {
    return {
      fonte: "BNMP",
      status: "INDISPONIVEL",
      resumo: "Consulta de mandados só se aplica a pessoa física.",
      apontamentos: [],
    };
  }

  const emissao = await emitirCertidao({ chaveCertidao: "BNMP_MANDADO", parte });

  if (!emissao.ok) {
    return {
      fonte: "BNMP",
      status: "ERRO",
      resumo: "Consulta ao banco de mandados de prisão não concluída.",
      erro: emissao.erro,
      apontamentos: [
        {
          gravidade: "MEDIA",
          eixo: "IDONEIDADE",
          titulo: "Mandados de prisão não verificados nesta auditoria",
          detalhe: `A consulta falhou: ${emissao.erro} Repita antes de assinar qualquer documento.`,
          fonte: "CNJ",
        },
      ],
    };
  }

  const { certidao } = emissao;

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
          "A consulta encontrou registro. Confira o comprovante e confirme a identidade — pode ser homonímia. " +
          "Confirmando-se, não assine contrato, procuração ou escritura: além do risco prático, transferir " +
          "patrimônio por quem está foragido levanta suspeita de ocultação de bens e pode ser desfeito.",
        fonte: "CNJ — Banco Nacional de Mandados de Prisão",
      },
    ],
  };
}

/** Consulta improbidade administrativa e inelegibilidade no CNJ. */
export async function consultarImprobidade(parte: DadosDaParte): Promise<ResultadoFonte> {
  if (!infosimplesConfigurado()) {
    return {
      fonte: "IMPROBIDADE_CNJ",
      status: "INDISPONIVEL",
      resumo: "Improbidade administrativa não verificada: consulta automática não contratada.",
      apontamentos: [],
    };
  }

  const emissao = await emitirCertidao({ chaveCertidao: "IMPROBIDADE_CNJ", parte });

  if (!emissao.ok) {
    return {
      fonte: "IMPROBIDADE_CNJ",
      status: "ERRO",
      resumo: "Consulta de improbidade não concluída.",
      erro: emissao.erro,
      apontamentos: [],
    };
  }

  const { certidao } = emissao;

  if (certidao.resultado === "NADA_CONSTA") {
    return {
      fonte: "IMPROBIDADE_CNJ",
      status: "CONCLUIDA",
      resumo: "Nada consta no cadastro de improbidade e inelegibilidade.",
      resultado: certidao.bruto,
      apontamentos: [],
    };
  }

  return {
    fonte: "IMPROBIDADE_CNJ",
    status: "CONCLUIDA",
    resumo: "Há registro no cadastro de improbidade administrativa.",
    resultado: certidao.bruto,
    apontamentos: [
      {
        gravidade: "GRAVE",
        eixo: "IDONEIDADE",
        titulo: "Registro de improbidade administrativa",
        detalhe:
          "Condenação por improbidade costuma vir acompanhada de indisponibilidade de bens — que pode alcançar " +
          "justamente o crédito que se pretende ceder. Confira o comprovante e verifique se há constrição sobre " +
          "o ativo antes de qualquer pagamento.",
        fonte: "CNJ — improbidade e inelegibilidade",
      },
    ],
  };
}
