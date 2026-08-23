/**
 * Dívida Ativa da União (PGFN).
 *
 * Consulta a base local carregada dos dados abertos da PGFN. O portal Dívida
 * Aberta usa hCaptcha invisível e recusa robô, mas a própria PGFN publica a
 * base inteira por trimestre, feita para uso em massa — é dessa base que estes
 * dados vêm. Carregue com `node scripts/importar-divida-ativa.mjs`.
 *
 * Num precatório isso pesa mais que em qualquer outro ativo: débito inscrito em
 * dívida ativa pode ser compensado contra o crédito a receber, e o comprador
 * descobre isso quando o dinheiro não chega.
 *
 * DUAS LIMITAÇÕES QUE PRECISAM APARECER NO PARECER:
 *  1. O CPF vem MASCARADO nos arquivos públicos. Para pessoa física o
 *     casamento é por seis dígitos mais o nome — levanta suspeita, não
 *     identifica. Para empresa, o CNPJ vem completo e a busca é exata.
 *  2. Os dados são do trimestre carregado, não de hoje.
 */
import { prisma } from "@/lib/prisma";
import { moeda, dataCurta } from "@/lib/formato";
import { somenteAlfanumerico, somenteNumeros } from "@/lib/validacao";
import type { Apontamento, ResultadoFonte } from "../tipos";

const ROTULO_CONJUNTO: Record<string, string> = {
  FGTS: "FGTS",
  PREVIDENCIARIO: "previdenciário (INSS)",
  NAO_PREVIDENCIARIO: "não previdenciário (tributos federais)",
};

const TODOS = ["FGTS", "PREVIDENCIARIO", "NAO_PREVIDENCIARIO"];

function normalizarNome(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function consultarDividaAtiva(params: {
  documento: string;
  tipoPessoa: "PF" | "PJ";
  nome: string;
  valorOperacao: number | null;
}): Promise<ResultadoFonte> {
  const { documento, tipoPessoa, nome, valorOperacao } = params;

  // ----- o que está carregado -----
  const cargas = await prisma.cargaDados.findMany({
    where: { fonte: "PGFN_DIVIDA_ATIVA", situacao: "CONCLUIDA" },
  });

  if (cargas.length === 0) {
    return {
      fonte: "DIVIDA_ATIVA_UNIAO",
      status: "INDISPONIVEL",
      resumo: "Dívida ativa da União não consultada: a base pública ainda não foi carregada.",
      apontamentos: [
        {
          gravidade: "MEDIA",
          eixo: "CAPACIDADE",
          titulo: "Dívida ativa da União não verificada",
          detalhe:
            "A base de dados abertos da PGFN ainda não foi carregada neste sistema. Enquanto isso, exija a " +
            "certidão negativa de débitos federais da parte. Para carregar: " +
            "node scripts/importar-divida-ativa.mjs",
          fonte: "PGFN",
        },
      ],
    };
  }

  const carregados = cargas.map((c) => c.conjunto);
  const faltando = TODOS.filter((t) => !carregados.includes(t));
  const referencia = cargas[0]?.referencia ?? "";

  // ----- busca -----
  const inscricoes =
    tipoPessoa === "PJ"
      ? await prisma.dividaAtivaUniao.findMany({
          where: { documento: somenteAlfanumerico(documento), tipoPessoa: "PJ" },
          orderBy: { valorConsolidado: "desc" },
          take: 500,
        })
      : await (async () => {
          // Pessoa física: o arquivo público traz só os seis dígitos do meio do
          // CPF. Casamos por eles E pelo nome — um sozinho traria homônimo.
          const cpf = somenteNumeros(documento);
          if (cpf.length !== 11) return [];
          const miolo = cpf.slice(3, 9);

          return prisma.dividaAtivaUniao.findMany({
            where: { cpfMiolo: miolo, nomeNormalizado: normalizarNome(nome) },
            orderBy: { valorConsolidado: "desc" },
            take: 500,
          });
        })();

  const naoConsultados =
    faltando.length > 0
      ? ` Não foi consultado o conjunto ${faltando.map((f) => ROTULO_CONJUNTO[f]).join(" e ")}.`
      : "";

  if (inscricoes.length === 0) {
    const apontamentos: Apontamento[] = [];

    if (faltando.length > 0) {
      apontamentos.push({
        gravidade: "MEDIA",
        eixo: "CAPACIDADE",
        titulo: "Dívida ativa consultada só em parte",
        detalhe:
          `Nada consta nos conjuntos carregados, mas o conjunto ${faltando
            .map((f) => ROTULO_CONJUNTO[f])
            .join(" e ")} não foi verificado — e é justamente onde ficam os tributos federais. ` +
          "Exija a certidão negativa de débitos federais, ou carregue o conjunto que falta.",
        fonte: "PGFN — dados abertos",
      });
    }

    if (tipoPessoa === "PF") {
      apontamentos.push({
        gravidade: "BAIXA",
        eixo: "CAPACIDADE",
        titulo: "Busca por CPF é parcial",
        detalhe:
          "Nos arquivos públicos o CPF vem mascarado, então a busca casa seis dígitos mais o nome. Nome grafado " +
          "de forma diferente na PGFN pode esconder um débito existente. A certidão negativa resolve a dúvida.",
        fonte: "PGFN — dados abertos",
      });
    }

    return {
      fonte: "DIVIDA_ATIVA_UNIAO",
      status: "CONCLUIDA",
      resumo: `Nada consta na dívida ativa da União (posição ${referencia}).${naoConsultados}`,
      resultado: { encontrados: 0, conjuntos: carregados, referencia },
      apontamentos,
    };
  }

  // ----- consolida o que foi encontrado -----
  const total = inscricoes.reduce((soma, i) => soma + Number(i.valorConsolidado), 0);
  const ajuizadas = inscricoes.filter((i) => i.ajuizado);
  const totalAjuizado = ajuizadas.reduce((soma, i) => soma + Number(i.valorConsolidado), 0);

  const maisAntiga = inscricoes
    .map((i) => i.dataInscricao)
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const porTipo = new Map<string, number>();
  for (const i of inscricoes) {
    porTipo.set(i.tipoDivida, (porTipo.get(i.tipoDivida) ?? 0) + Number(i.valorConsolidado));
  }

  const relevante = valorOperacao != null && valorOperacao > 0 && total >= valorOperacao * 0.1;

  const detalhePorTipo = [...porTipo.entries()]
    .map(([tipo, valor]) => `${ROTULO_CONJUNTO[tipo] ?? tipo}: ${moeda(valor)}`)
    .join("; ");

  const apontamentos: Apontamento[] = [
    {
      gravidade: relevante || ajuizadas.length > 0 ? "GRAVE" : "MEDIA",
      eixo: "CAPACIDADE",
      titulo: `${inscricoes.length} inscrição(ões) em dívida ativa da União — ${moeda(total)}`,
      detalhe:
        `${detalhePorTipo}.` +
        (ajuizadas.length > 0
          ? ` ${ajuizadas.length} já ajuizada(s), somando ${moeda(totalAjuizado)} — há execução fiscal em curso.`
          : "") +
        (maisAntiga ? ` A mais antiga é de ${dataCurta(maisAntiga)}.` : "") +
        " Débito inscrito em dívida ativa pode ser compensado contra crédito a receber da Fazenda e pode levar " +
        "à penhora do crédito antes que a cessão produza efeito. Num precatório, é o risco que mais derruba " +
        "operação já paga.",
      fonte: `PGFN — dados abertos (${referencia})`,
    },
  ];

  if (tipoPessoa === "PF") {
    apontamentos.push({
      gravidade: "INFO",
      eixo: "CAPACIDADE",
      titulo: "Confirme a identidade antes de concluir",
      detalhe:
        "O CPF vem mascarado nos arquivos públicos; o casamento foi por seis dígitos mais o nome. Confirme com " +
        "a certidão da própria parte antes de tratar o débito como certo.",
      fonte: "PGFN — dados abertos",
    });
  }

  if (faltando.length > 0) {
    apontamentos.push({
      gravidade: "MEDIA",
      eixo: "CAPACIDADE",
      titulo: "Ainda pode haver mais",
      detalhe:
        `O conjunto ${faltando.map((f) => ROTULO_CONJUNTO[f]).join(" e ")} não foi verificado. ` +
        "O total encontrado é um piso, não o valor completo.",
      fonte: "PGFN — dados abertos",
    });
  }

  return {
    fonte: "DIVIDA_ATIVA_UNIAO",
    status: "CONCLUIDA",
    resumo:
      `${inscricoes.length} inscrição(ões) somando ${moeda(total)}` +
      (ajuizadas.length > 0 ? `, ${ajuizadas.length} ajuizada(s)` : "") +
      `.${naoConsultados}`,
    resultado: {
      encontrados: inscricoes.length,
      total,
      totalAjuizado,
      conjuntos: carregados,
      referencia,
      // Guarda as maiores como prova do que foi visto, sem inchar o registro.
      inscricoes: inscricoes.slice(0, 50).map((i) => ({
        numero: i.numeroInscricao,
        tipo: i.tipoDivida,
        situacao: i.situacao,
        receita: i.receitaPrincipal,
        ajuizado: i.ajuizado,
        valor: Number(i.valorConsolidado),
        inscritaEm: i.dataInscricao,
      })),
    },
    apontamentos,
  };
}
