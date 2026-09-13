/**
 * Processos judiciais em que a empresa figura, buscados pelo CNPJ.
 *
 * POR QUE NÃO É O DATAJUD: a base pública do CNJ consulta por NÚMERO de
 * processo, não por parte. "Todos os processos do fulano" não existe lá —
 * confirmado no próprio `datajud.ts`. Quem tem busca por parte são os
 * tribunais, cada um no seu sistema, e é isso que a Infosimples automatiza.
 *
 * COBERTURA: varia por tribunal, como tudo aqui. O TJSP responde busca por
 * CNPJ e devolve os processos paginados — confirmado contra a API em
 * 13/09/2026, com uma empresa de porte: 25 processos na primeira página, com
 * número, classe, assunto, foro, vara e juiz, por R$ 0,20 a página. Onde não
 * há cobertura, o sistema diz que não verificou, em vez de sugerir que a
 * empresa não tem processo.
 *
 * O QUE ISTO NÃO FAZ: julgar. Processo em curso não é condenação, e a
 * quantidade sozinha não mede risco — uma varejista grande tem milhares de
 * ações de consumidor e isso é rotina do negócio dela. Aqui se lista o que
 * existe, com a classe de cada um; a leitura fica com quem assina.
 */
import type { Apontamento, ResultadoFonte } from "../tipos";
import { somenteNumeros } from "@/lib/validacao";
import { chamar, infosimplesConfigurado } from "./infosimples";
import { registrarUsoConsulta, type ContextoConsulta } from "@/lib/consultas/uso";

/**
 * Teto de páginas lidas por empresa.
 *
 * Cada página custa uma consulta (R$ 0,20 na medição de 13/09/2026, 25
 * processos por página). Sem teto, uma empresa com 500 páginas viraria R$ 100
 * numa auditoria só, sem ninguém ter autorizado. Com o teto, o relatório
 * avisa que parou e que o número é um piso — que é honesto e barato.
 */
const MAXIMO_PAGINAS = 20;

/** Onde há busca de processo por CNPJ, por estado da sede. */
const BUSCA_POR_UF: Record<string, { caminho: string; tribunal: string }> = {
  SP: { caminho: "tribunal/tjsp/primeiro-grau", tribunal: "Tribunal de Justiça de São Paulo (1º grau)" },
};

export type ProcessoEncontrado = {
  numero: string | null;
  classe: string | null;
  assunto: string | null;
  foro: string | null;
  vara: string | null;
};

export function temBuscaDeProcessos(uf: string | null): boolean {
  return infosimplesConfigurado() && Boolean(uf && BUSCA_POR_UF[uf.toUpperCase()]);
}

function texto(registro: Record<string, unknown>, chave: string): string | null {
  const v = registro[chave];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function consultarProcessosDaEmpresa(params: {
  documento: string;
  uf: string | null;
  contexto?: ContextoConsulta;
}): Promise<ResultadoFonte> {
  const uf = params.uf?.toUpperCase() ?? null;
  const destino = uf ? BUSCA_POR_UF[uf] : null;

  if (!infosimplesConfigurado() || !destino) {
    return {
      fonte: "PROCESSOS_JUDICIAIS",
      status: "INDISPONIVEL",
      resumo: uf
        ? `Busca de processos por CNPJ ainda não disponível para ${uf}.`
        : "Busca de processos não realizada: falta a UF da sede no cadastro.",
      apontamentos: [
        {
          gravidade: "MEDIA",
          eixo: "IDONEIDADE",
          titulo: "Processos judiciais não verificados",
          detalhe:
            "Não há busca automática de processos por CNPJ para este estado. Isso NÃO significa que a empresa " +
            "não tem processos — significa que não foram procurados. Consulte o portal do tribunal da sede.",
          fonte: "Tribunais estaduais",
        },
      ],
    };
  }

  const documento = somenteNumeros(params.documento);
  const resposta = await chamar(destino.caminho, { cnpj: documento });

  await registrarUsoConsulta({
    provedor: "INFOSIMPLES",
    servico: "PROCESSOS_JUDICIAIS",
    documento,
    custoBruto: resposta.ok ? (resposta.resposta.header?.price ?? null) : resposta.custo,
    contexto: params.contexto,
    erro: resposta.ok ? null : resposta.erro,
  });

  const caminho = destino.caminho;

  /** Cada página é cobrada à parte. Ver `MAXIMO_PAGINAS`. */
  async function lerDemaisPaginas(total: number): Promise<{ processos: Record<string, unknown>[]; lidas: number }> {
    const juntos: Record<string, unknown>[] = [];
    const ate = Math.min(total, MAXIMO_PAGINAS);

    for (let pagina = 2; pagina <= ate; pagina++) {
      const r = await chamar(caminho, { cnpj: documento, pagina: String(pagina) });

      await registrarUsoConsulta({
        provedor: "INFOSIMPLES",
        servico: "PROCESSOS_JUDICIAIS",
        documento,
        custoBruto: r.ok ? (r.resposta.header?.price ?? null) : r.custo,
        contexto: params.contexto,
        erro: r.ok ? null : r.erro,
      });

      // Página que falha não derruba o que já veio: o resultado sai com o que
      // foi possível ler, dizendo quantas páginas entraram.
      if (!r.ok) return { processos: juntos, lidas: pagina - 1 };

      const reg = (r.resposta.data ?? [])[0] ?? {};
      const lista = Array.isArray(reg.processos) ? (reg.processos as Record<string, unknown>[]) : [];
      juntos.push(...lista);
    }

    return { processos: juntos, lidas: ate };
  }

  if (!resposta.ok) {
    // 612 é a resposta de "consultei e não achou nada", diferente de falha.
    if (resposta.codigo === 612) {
      return {
        fonte: "PROCESSOS_JUDICIAIS",
        status: "CONCLUIDA",
        resumo: `Nenhum processo encontrado no ${destino.tribunal}.`,
        apontamentos: [],
      };
    }

    return {
      fonte: "PROCESSOS_JUDICIAIS",
      status: "ERRO",
      resumo: "Busca de processos judiciais não concluída.",
      erro: resposta.erro,
      apontamentos: [
        {
          gravidade: "MEDIA",
          eixo: "IDONEIDADE",
          titulo: "Processos judiciais não verificados nesta análise",
          detalhe: `A busca falhou: ${resposta.erro} Repita antes de concluir o relatório.`,
          fonte: destino.tribunal,
        },
      ],
    };
  }

  const registro = (resposta.resposta.data ?? [])[0] ?? {};
  const brutos = Array.isArray(registro.processos) ? (registro.processos as Record<string, unknown>[]) : [];
  const paginas = Number(registro.paginas ?? 1) || 1;

  let paginasLidas = 1;
  if (paginas > 1) {
    const demais = await lerDemaisPaginas(paginas);
    brutos.push(...demais.processos);
    paginasLidas = demais.lidas;
  }

  const processos: ProcessoEncontrado[] = brutos.map((p) => ({
    numero: texto(p, "processo"),
    classe: texto(p, "classe"),
    assunto: texto(p, "assunto"),
    foro: texto(p, "foro"),
    vara: texto(p, "vara"),
  }));

  if (processos.length === 0) {
    return {
      fonte: "PROCESSOS_JUDICIAIS",
      status: "CONCLUIDA",
      resumo: `Nenhum processo encontrado no ${destino.tribunal}.`,
      resultado: resposta.resposta,
      apontamentos: [],
    };
  }

  // Quando o teto de páginas corta a leitura, o número vira "ao menos": dizer
  // "500 processos" havendo mais seria afirmar o que não se apurou.
  const haMais = paginas > paginasLidas;
  const contagem = haMais ? `ao menos ${processos.length}` : `${processos.length}`;

  const classes = [...new Set(processos.map((p) => p.classe).filter(Boolean))].slice(0, 6).join("; ");

  const apontamentos: Apontamento[] = [
    {
      gravidade: "MEDIA",
      eixo: "IDONEIDADE",
      titulo: `Processos judiciais encontrados: ${contagem}`,
      detalhe:
        `A empresa figura em ${contagem} processo(s) no ${destino.tribunal}.` +
        (classes ? ` Classes encontradas: ${classes}.` : "") +
        " Processo em curso não é condenação, e volume alto é rotina em empresa grande — o que importa é a " +
        "natureza de cada um. Leia a lista antes de concluir." +
        (haMais
          ? ` A leitura parou em ${paginasLidas} de ${paginas} páginas (limite do sistema): existem mais ` +
            "processos além dos listados, e a contagem acima é um piso."
          : ""),
      fonte: destino.tribunal,
    },
  ];

  return {
    fonte: "PROCESSOS_JUDICIAIS",
    status: "CONCLUIDA",
    resumo: `${contagem} processo(s) no ${destino.tribunal}.`,
    resultado: resposta.resposta,
    apontamentos,
  };
}
