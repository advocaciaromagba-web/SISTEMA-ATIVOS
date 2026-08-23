/**
 * DataJud (CNJ) — base pública de processos judiciais.
 *
 * Serve para confirmar que o processo que deu origem ao crédito existe mesmo,
 * em que tribunal tramita e qual foi o último movimento. Num precatório, isso é
 * a diferença entre comprar um crédito e comprar um número de papel.
 *
 * Duas limitações que precisam ficar claras:
 *
 *  1. A API consulta por NÚMERO DE PROCESSO, não por CPF ou CNPJ da parte. Não
 *     existe, na base pública, "todos os processos do fulano" — quem oferece
 *     isso são bureaus pagos que montaram a própria base.
 *  2. Cada tribunal tem seu endereço na API (api_publica_tjsp, api_publica_trf3
 *     e assim por diante), e o alias precisa ser deduzido do próprio número.
 *
 * A chave é pública e gratuita, divulgada pelo CNJ na documentação da API.
 * Coloque em DATAJUD_API_KEY no .env.
 */
import type { ResultadoFonte } from "../tipos";
import { formatarNumeroProcessoCnj, somenteNumeros, validarNumeroProcessoCnj } from "@/lib/validacao";

const TEMPO_LIMITE = 20000;

/**
 * Descobre o endereço do tribunal a partir do número do processo.
 * Posições 14 e 15 do número CNJ (JTR): J = segmento, TR = tribunal.
 */
function aliasDoTribunal(numero: string): string | null {
  const segmento = numero[13];
  const tribunal = numero.slice(14, 16);

  // 8 = Justiça Estadual; 4 = Justiça Federal; 5 = Justiça do Trabalho.
  const UFS: Record<string, string> = {
    "01": "ac", "02": "al", "03": "ap", "04": "am", "05": "ba", "06": "ce", "07": "df",
    "08": "es", "09": "go", "10": "ma", "11": "mt", "12": "ms", "13": "mg", "14": "pa",
    "15": "pb", "16": "pr", "17": "pe", "18": "pi", "19": "rj", "20": "rn", "21": "rs",
    "22": "ro", "23": "rr", "24": "sc", "25": "se", "26": "sp", "27": "to",
  };

  if (segmento === "8") {
    const uf = UFS[tribunal];
    return uf ? `api_publica_tj${uf}` : null;
  }
  if (segmento === "4") return `api_publica_trf${Number(tribunal)}`;
  if (segmento === "5") return `api_publica_trt${Number(tribunal)}`;

  return null;
}

export async function consultarProcesso(numeroProcesso: string): Promise<ResultadoFonte> {
  const numero = somenteNumeros(numeroProcesso);

  if (!validarNumeroProcessoCnj(numero)) {
    return {
      fonte: "DATAJUD",
      status: "INDISPONIVEL",
      resumo: "Número de processo fora do padrão do CNJ — consulta não realizada.",
      apontamentos: [
        {
          gravidade: "MEDIA",
          eixo: "IDONEIDADE",
          titulo: "Processo de origem não confere",
          detalhe:
            "O número informado não passa na conferência do dígito verificador do CNJ. Confirme o número no " +
            "documento original antes de seguir — número inválido pode indicar erro de digitação ou documento forjado.",
          fonte: "CNJ",
        },
      ],
    };
  }

  const chave = (process.env.DATAJUD_API_KEY ?? "").trim();
  if (!chave) {
    return {
      fonte: "DATAJUD",
      status: "INDISPONIVEL",
      resumo: "Processo não consultado: falta a chave pública gratuita do DataJud (CNJ).",
      apontamentos: [
        {
          gravidade: "BAIXA",
          eixo: "IDONEIDADE",
          titulo: "Existência do processo não confirmada",
          detalhe:
            "O número do processo passou na conferência dos dígitos, mas não foi confirmado junto ao tribunal. " +
            "Configure a chave gratuita do DataJud, ou confira o andamento diretamente no site do tribunal.",
          fonte: "CNJ",
        },
      ],
    };
  }

  const alias = aliasDoTribunal(numero);
  if (!alias) {
    return {
      fonte: "DATAJUD",
      status: "INDISPONIVEL",
      resumo: "Tribunal não coberto pela consulta automática.",
      apontamentos: [],
    };
  }

  try {
    const resposta = await fetch(`https://api-publica.datajud.cnj.jus.br/${alias}/_search`, {
      method: "POST",
      headers: { Authorization: `APIKey ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: { match: { numeroProcesso: numero } }, size: 1 }),
      signal: AbortSignal.timeout(TEMPO_LIMITE),
    });

    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const dados = (await resposta.json()) as {
      hits?: { hits?: Array<{ _source?: Record<string, unknown> }> };
    };
    const achado = dados.hits?.hits?.[0]?._source;

    if (!achado) {
      return {
        fonte: "DATAJUD",
        status: "CONCLUIDA",
        resumo: "Processo não localizado na base pública do CNJ.",
        resultado: { encontrado: false, alias },
        apontamentos: [
          {
            gravidade: "MEDIA",
            eixo: "IDONEIDADE",
            titulo: "Processo de origem não localizado",
            detalhe:
              `O processo ${formatarNumeroProcessoCnj(numero)} não foi encontrado na base do CNJ. ` +
              "Pode ser processo em segredo de justiça, ainda não replicado, ou de tribunal fora da base — " +
              "mas também pode ser número inexistente. Confirme no tribunal antes de assinar.",
            fonte: "DataJud — CNJ",
          },
        ],
      };
    }

    const classe = (achado.classe as { nome?: string } | undefined)?.nome ?? null;
    const orgao = (achado.orgaoJulgador as { nome?: string } | undefined)?.nome ?? null;
    const movimentos = Array.isArray(achado.movimentos) ? achado.movimentos.length : 0;

    return {
      fonte: "DATAJUD",
      status: "CONCLUIDA",
      resumo:
        `Processo localizado${classe ? ` — ${classe}` : ""}${orgao ? `, ${orgao}` : ""}` +
        `${movimentos ? `, ${movimentos} movimento(s)` : ""}.`,
      resultado: { encontrado: true, alias, dados: achado },
      apontamentos: [
        {
          gravidade: "INFO",
          eixo: "IDONEIDADE",
          titulo: "Processo de origem confirmado",
          detalhe:
            `${formatarNumeroProcessoCnj(numero)} existe na base do CNJ` +
            `${orgao ? `, em ${orgao}` : ""}. A existência do processo não confirma, por si, a titularidade do ` +
            "crédito nem o valor — confira a certidão de objeto e pé.",
          fonte: "DataJud — CNJ",
        },
      ],
    };
  } catch (erro) {
    return {
      fonte: "DATAJUD",
      status: "ERRO",
      resumo: "Consulta ao DataJud não concluída.",
      erro: (erro as Error).message,
      apontamentos: [],
    };
  }
}
