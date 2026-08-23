/**
 * As regras que transformam dados soltos em duas respostas: a parte é idônea?
 * ela dá conta do valor?
 *
 * Cada regra está escrita aqui, em código, e não num modelo de linguagem. Não é
 * preciosismo: a decisão de barrar uma contraparte precisa ser explicável linha
 * a linha quando alguém perguntar por quê — inclusive um juiz.
 *
 * Os limites usados (teto do MEI, do Simples) são os da legislação; as
 * proporções entre capital social e valor da operação são critério de risco,
 * assumido explicitamente e dito no parecer.
 */
import type {
  Apontamento,
  Capacidade,
  DadosCadastrais,
  Idoneidade,
  ResultadoAuditoria,
  ResultadoFonte,
} from "./tipos";
import { moeda } from "@/lib/formato";

// Tetos legais de faturamento anual.
const TETO_MEI = 81_000;
const TETO_MICROEMPRESA = 360_000;
const TETO_PEQUENO_PORTE = 4_800_000;

// Proporção mínima entre capital social e valor da operação para que a
// capacidade seja considerada compatível. Critério de risco, não regra legal.
const PROPORCAO_SUFICIENTE = 1;
const PROPORCAO_LIMITADA = 0.3;

// Idade da empresa a partir da qual o histórico deixa de ser um alerta.
const MESES_EMPRESA_NOVA = 6;
const MESES_EMPRESA_RECENTE = 24;

function mesesDesde(data: string | null): number | null {
  if (!data) return null;
  const inicio = new Date(data);
  if (Number.isNaN(inicio.getTime())) return null;
  return (Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

// ---------------------------------------------------------------------
// Idoneidade
// ---------------------------------------------------------------------

function analisarSituacaoCadastral(d: DadosCadastrais): Apontamento[] {
  const apontamentos: Apontamento[] = [];
  const situacao = (d.situacao ?? "").toUpperCase();

  if (!situacao) {
    apontamentos.push({
      gravidade: "MEDIA",
      eixo: "CADASTRO",
      titulo: "Situação cadastral não informada",
      detalhe: "Não foi possível confirmar se a empresa está ativa na Receita Federal.",
      fonte: "Receita Federal",
    });
    return apontamentos;
  }

  if (situacao !== "ATIVA") {
    const explicacoes: Record<string, string> = {
      BAIXADA: "A empresa foi encerrada. Não pode contratar, ceder crédito nem receber pagamento.",
      INAPTA:
        "A empresa está inapta, em regra por deixar de entregar declarações. Contratos firmados nessa condição " +
        "costumam ser questionados, e a empresa não obtém certidões.",
      SUSPENSA: "O cadastro está suspenso. Confirme o motivo antes de qualquer assinatura.",
      NULA: "O cadastro foi anulado — situação associada a inscrição irregular ou fraudulenta.",
    };

    apontamentos.push({
      gravidade: "GRAVE",
      eixo: "IDONEIDADE",
      titulo: `Empresa com situação cadastral ${situacao}`,
      detalhe:
        (explicacoes[situacao] ?? "A empresa não está ativa na Receita Federal.") +
        (d.motivoSituacao && d.motivoSituacao !== "SEM MOTIVO" ? ` Motivo registrado: ${d.motivoSituacao}.` : "") +
        (d.dataSituacao ? ` Desde ${new Date(d.dataSituacao).toLocaleDateString("pt-BR")}.` : ""),
      fonte: "Receita Federal",
    });
  }

  return apontamentos;
}

function analisarIdade(d: DadosCadastrais, valor: number | null): Apontamento[] {
  const meses = mesesDesde(d.dataAbertura);
  if (meses == null) return [];

  const abertura = new Date(d.dataAbertura!).toLocaleDateString("pt-BR");

  if (meses < MESES_EMPRESA_NOVA) {
    return [
      {
        // Empresa recém-aberta entrando em operação de valor alto é o desenho
        // clássico de empresa de fachada. Não prova nada sozinha — por isso é
        // alerta, não restrição.
        gravidade: valor != null && valor >= 500_000 ? "GRAVE" : "MEDIA",
        eixo: "IDONEIDADE",
        titulo: "Empresa aberta há menos de seis meses",
        detalhe:
          `Constituída em ${abertura}. Empresa nova não tem histórico que sustente uma operação relevante. ` +
          "Peça o contrato social, comprove a atividade real e confirme quem está por trás antes de seguir.",
        fonte: "Receita Federal",
      },
    ];
  }

  if (meses < MESES_EMPRESA_RECENTE) {
    return [
      {
        gravidade: "BAIXA",
        eixo: "IDONEIDADE",
        titulo: "Empresa com menos de dois anos",
        detalhe: `Constituída em ${abertura}. Histórico curto; confirme a atividade efetiva.`,
        fonte: "Receita Federal",
      },
    ];
  }

  return [];
}

function normalizarNome(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palavras que não distinguem uma empresa de outra. */
const GENERICAS = new Set([
  "LTDA", "SA", "S", "A", "EIRELI", "ME", "EPP", "MEI", "CIA", "COMPANHIA",
  "COMERCIO", "COMERCIAL", "INDUSTRIA", "INDUSTRIAL", "SERVICOS", "SERVICO",
  "PARTICIPACOES", "EMPREENDIMENTOS", "REPRESENTACOES", "DISTRIBUIDORA",
  "DE", "DA", "DO", "DOS", "DAS", "E", "EM", "DE1",
]);

/**
 * Confere se o nome cadastrado é mesmo o nome daquele CNPJ.
 *
 * Existe porque foi exatamente o que passou batido num teste: um cadastro com
 * nome inventado e um CNPJ real de outra entidade recebeu "sem apontamentos".
 * Documento certo com nome errado é erro de digitação — ou é alguém assumindo
 * a identidade de outra empresa. Nos dois casos, o contrato sai nulo.
 */
function analisarNome(d: DadosCadastrais, nomeCadastrado: string): Apontamento[] {
  if (!d.razaoSocial) return [];

  const cadastrado = normalizarNome(nomeCadastrado);
  const oficial = normalizarNome(d.razaoSocial);
  const fantasia = d.nomeFantasia ? normalizarNome(d.nomeFantasia) : "";

  if (cadastrado === oficial || (fantasia && cadastrado === fantasia)) return [];

  const relevantes = (t: string) => t.split(" ").filter((p) => p.length > 2 && !GENERICAS.has(p));

  const palavrasCadastro = relevantes(cadastrado);
  const palavrasOficiais = new Set(relevantes(oficial));
  const palavrasFantasia = new Set(relevantes(fantasia));

  if (palavrasCadastro.length === 0) return [];

  const coincidem = palavrasCadastro.filter(
    (p) => palavrasOficiais.has(p) || palavrasFantasia.has(p)
  ).length;
  const proporcao = coincidem / palavrasCadastro.length;

  // Coincidência quase total é abreviação ou grafia diferente do mesmo nome.
  if (proporcao >= 0.7) return [];

  if (proporcao >= 0.34) {
    return [
      {
        gravidade: "MEDIA",
        eixo: "CADASTRO",
        titulo: "Nome cadastrado difere da razão social",
        detalhe:
          `No cadastro consta "${nomeCadastrado}"; na Receita, este CNPJ pertence a "${d.razaoSocial}"` +
          `${d.nomeFantasia ? ` (nome fantasia: ${d.nomeFantasia})` : ""}. ` +
          "Ajuste o cadastro para a razão social oficial — é ela que precisa constar no contrato.",
        fonte: "Receita Federal",
      },
    ];
  }

  return [
    {
      gravidade: "GRAVE",
      eixo: "IDONEIDADE",
      titulo: "Nome cadastrado não corresponde ao CNPJ",
      detalhe:
        `O cadastro diz "${nomeCadastrado}", mas o CNPJ informado pertence a "${d.razaoSocial}" ` +
        `${d.municipio ? `(${d.municipio}/${d.uf})` : ""}. São entidades diferentes. ` +
        "Ou o número foi digitado errado, ou alguém está se apresentando com o CNPJ de outra empresa. " +
        "Não gere documento nem siga com a operação antes de esclarecer.",
      fonte: "Receita Federal",
    },
  ];
}

/**
 * Confere se quem vai assinar pelo lado da empresa aparece no quadro de sócios.
 *
 * Contrato assinado por quem não tem poder de representação é contrato que não
 * se sustenta. Esta é a verificação mais barata e mais esquecida da operação.
 */
function analisarRepresentante(
  d: DadosCadastrais,
  representante: { nome: string | null; cpf: string | null } | null
): Apontamento[] {
  if (!representante?.nome || d.socios.length === 0) return [];

  const normalizar = (t: string) =>
    t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

  const alvo = normalizar(representante.nome);
  const consta = d.socios.some((s) => normalizar(s.nome) === alvo);

  if (consta) return [];

  // A Receita mascara o CPF do sócio (***123456**); comparamos os seis dígitos
  // do meio, que é o que fica visível.
  if (representante.cpf && representante.cpf.length === 11) {
    const miolo = representante.cpf.slice(3, 9);
    if (d.socios.some((s) => (s.documento ?? "").includes(miolo))) return [];
  }

  return [
    {
      gravidade: "MEDIA",
      eixo: "IDONEIDADE",
      titulo: "Quem assina não consta no quadro de sócios",
      detalhe:
        `${representante.nome} está cadastrado como representante, mas não aparece entre os sócios registrados ` +
        "na Receita. Isso é normal quando há procuração ou o cargo é de administrador não sócio — mas então " +
        "exija a procuração ou a ata que confere o poder de assinar, e guarde junto à operação. Sem isso, o " +
        "contrato pode ser anulado por falta de poder de representação.",
      fonte: "Receita Federal — quadro societário",
    },
  ];
}

// ---------------------------------------------------------------------
// Capacidade de pagamento
// ---------------------------------------------------------------------

function analisarCapacidade(
  d: DadosCadastrais | null,
  valor: number | null
): { capacidade: Capacidade; apontamentos: Apontamento[] } {
  const apontamentos: Apontamento[] = [];

  if (!d) return { capacidade: "NAO_AVALIADA", apontamentos };

  const porte = (d.porte ?? "").toUpperCase();
  const capital = d.capitalSocial;

  // ----- enquadramento contra o valor da operação -----
  if (valor != null && valor > 0) {
    if (d.optanteMei && valor > TETO_MEI) {
      apontamentos.push({
        gravidade: "GRAVE",
        eixo: "CAPACIDADE",
        titulo: "MEI em operação acima do próprio teto legal",
        detalhe:
          `A parte é microempreendedor individual, cujo faturamento anual é limitado a ${moeda(TETO_MEI)}. ` +
          `A operação é de ${moeda(valor)}. O enquadramento é incompatível com o negócio: ou a parte não tem ` +
          "capacidade para honrá-lo, ou está operando fora do seu regime. Nos dois casos, não siga sem esclarecer.",
        fonte: "Receita Federal",
      });
    } else if (porte.includes("MICRO") && valor > TETO_MICROEMPRESA) {
      apontamentos.push({
        gravidade: "MEDIA",
        eixo: "CAPACIDADE",
        titulo: "Microempresa em operação acima do seu porte",
        detalhe:
          `Microempresa fatura até ${moeda(TETO_MICROEMPRESA)} por ano, e a operação é de ${moeda(valor)}. ` +
          "Peça demonstrações financeiras ou comprovação de origem dos recursos.",
        fonte: "Receita Federal",
      });
    } else if (porte.includes("PEQUENO") && valor > TETO_PEQUENO_PORTE) {
      apontamentos.push({
        gravidade: "MEDIA",
        eixo: "CAPACIDADE",
        titulo: "Empresa de pequeno porte em operação acima do seu porte",
        detalhe:
          `O limite do porte é ${moeda(TETO_PEQUENO_PORTE)} por ano, e a operação é de ${moeda(valor)}. ` +
          "Peça demonstrações financeiras.",
        fonte: "Receita Federal",
      });
    }
  }

  // ----- capital social contra o valor -----
  if (valor == null || valor <= 0) {
    return {
      capacidade: "NAO_AVALIADA",
      apontamentos: apontamentos.concat({
        gravidade: "INFO",
        eixo: "CAPACIDADE",
        titulo: "Capacidade não medida contra um valor",
        detalhe:
          "A auditoria não foi vinculada a uma operação com valor definido, então não há contra o que comparar. " +
          "Refaça a auditoria a partir da operação para obter a análise de capacidade.",
        fonte: "Sistema",
      }),
    };
  }

  if (capital == null) {
    return {
      capacidade: "NAO_AVALIADA",
      apontamentos: apontamentos.concat({
        gravidade: "MEDIA",
        eixo: "CAPACIDADE",
        titulo: "Capital social não informado",
        detalhe: "Sem o capital social não foi possível estimar a capacidade. Peça o contrato social atualizado.",
        fonte: "Receita Federal",
      }),
    };
  }

  const proporcao = capital / valor;

  if (proporcao >= PROPORCAO_SUFICIENTE) {
    apontamentos.push({
      gravidade: "INFO",
      eixo: "CAPACIDADE",
      titulo: "Capital social compatível com a operação",
      detalhe:
        `Capital social de ${moeda(capital)} para uma operação de ${moeda(valor)}. ` +
        "Lembre-se de que capital social é o valor declarado na constituição, não o dinheiro em caixa hoje: " +
        "é indício favorável, não comprovação de pagamento.",
      fonte: "Receita Federal",
    });
    return { capacidade: "SUFICIENTE", apontamentos };
  }

  if (proporcao >= PROPORCAO_LIMITADA) {
    apontamentos.push({
      gravidade: "MEDIA",
      eixo: "CAPACIDADE",
      titulo: "Capital social abaixo do valor da operação",
      detalhe:
        `Capital social de ${moeda(capital)} para uma operação de ${moeda(valor)} — cerca de ` +
        `${Math.round(proporcao * 100)}% do valor. Não impede o negócio, mas recomenda garantia: pagamento à ` +
        "vista, escrow, caução ou aval dos sócios.",
      fonte: "Receita Federal",
    });
    return { capacidade: "LIMITADA", apontamentos };
  }

  apontamentos.push({
    gravidade: "GRAVE",
    eixo: "CAPACIDADE",
    titulo: "Capital social muito abaixo do valor da operação",
    detalhe:
      `Capital social de ${moeda(capital)} para uma operação de ${moeda(valor)} — cerca de ` +
      `${Math.round(proporcao * 100)}% do valor. A desproporção é grande demais para ser ignorada. ` +
      "Exija comprovação de recursos e garantia real antes de assinar, ou estruture o pagamento à vista.",
    fonte: "Receita Federal",
  });
  return { capacidade: "INSUFICIENTE", apontamentos };
}

// ---------------------------------------------------------------------
// Consolidação
// ---------------------------------------------------------------------

const PESO: Record<string, number> = { GRAVE: 35, MEDIA: 12, BAIXA: 5, INFO: 0 };

function classificarIdoneidade(apontamentos: Apontamento[]): Idoneidade {
  const doEixo = apontamentos.filter((a) => a.eixo === "IDONEIDADE");
  if (doEixo.some((a) => a.gravidade === "GRAVE")) return "RESTRICAO";
  if (doEixo.some((a) => a.gravidade === "MEDIA" || a.gravidade === "BAIXA")) return "ATENCAO";
  return "SEM_APONTAMENTO";
}

function montarParecer(
  nome: string,
  idoneidade: Idoneidade,
  capacidade: Capacidade,
  apontamentos: Apontamento[],
  d: DadosCadastrais | null,
  valor: number | null,
  indisponiveis: string[]
): string {
  const linhas: string[] = [];

  const graves = apontamentos.filter((a) => a.gravidade === "GRAVE");
  const medias = apontamentos.filter((a) => a.gravidade === "MEDIA");

  // ----- veredito -----
  if (idoneidade === "RESTRICAO") {
    linhas.push(
      `A auditoria encontrou restrição em ${nome}. Enquanto o ponto não for esclarecido, a parte fica ` +
        "bloqueada para novas operações e para geração de documentos."
    );
  } else if (idoneidade === "ATENCAO") {
    linhas.push(`${nome} não tem restrição impeditiva, mas há pontos que pedem conferência antes de assinar.`);
  } else {
    linhas.push(`Não foi encontrada restrição de idoneidade em ${nome} nas fontes consultadas.`);
  }

  // ----- capacidade -----
  if (capacidade === "SUFICIENTE") {
    linhas.push("A capacidade de pagamento aparenta ser compatível com o valor da operação.");
  } else if (capacidade === "LIMITADA") {
    linhas.push("A capacidade de pagamento é limitada para o valor da operação — recomenda-se garantia.");
  } else if (capacidade === "INSUFICIENTE") {
    linhas.push(
      "A capacidade de pagamento aparenta ser incompatível com o valor da operação. Não avance sem " +
        "comprovação de recursos."
    );
  } else {
    linhas.push("A capacidade de pagamento não pôde ser medida com os dados disponíveis.");
  }

  // ----- o que sustenta -----
  if (d) {
    const partes: string[] = [];
    if (d.situacao) partes.push(`situação ${d.situacao.toLowerCase()} na Receita`);
    if (d.dataAbertura) {
      const meses = mesesDesde(d.dataAbertura);
      if (meses != null) partes.push(`${Math.floor(meses / 12)} ano(s) de atividade`);
    }
    if (d.capitalSocial != null) partes.push(`capital social de ${moeda(d.capitalSocial)}`);
    if (d.socios.length > 0) partes.push(`${d.socios.length} sócio(s) registrado(s)`);
    if (partes.length > 0) linhas.push(`Cadastro: ${partes.join(", ")}.`);
  }

  if (valor != null) linhas.push(`Valor considerado na análise: ${moeda(valor)}.`);

  // ----- contagem -----
  if (graves.length > 0) {
    linhas.push(`${graves.length} apontamento(s) grave(s): ${graves.map((a) => a.titulo).join("; ")}.`);
  }
  if (medias.length > 0) {
    linhas.push(`${medias.length} ponto(s) de atenção: ${medias.map((a) => a.titulo).join("; ")}.`);
  }

  // ----- honestidade sobre o alcance -----
  if (indisponiveis.length > 0) {
    linhas.push(
      `Não foram consultadas: ${indisponiveis.join(", ")}. O resultado vale apenas para as fontes que ` +
        "responderam — não é um atestado de idoneidade."
    );
  }

  return linhas.join(" ");
}

export function consolidar(params: {
  nome: string;
  tipo: "PF" | "PJ";
  dadosCadastrais: DadosCadastrais | null;
  representante: { nome: string | null; cpf: string | null } | null;
  pep: boolean;
  valorReferencia: number | null;
  fontes: ResultadoFonte[];
  /** Apontamentos vindos das certidões apresentadas pela parte. */
  apontamentosExtras?: Apontamento[];
}): ResultadoAuditoria {
  const { nome, tipo, dadosCadastrais: d, representante, pep, valorReferencia, fontes } = params;

  const apontamentos: Apontamento[] = [];

  // Tudo o que as fontes já apontaram por conta própria.
  for (const f of fontes) apontamentos.push(...f.apontamentos);

  // O que as certidões apresentadas revelaram (ou o que falta apresentar).
  apontamentos.push(...(params.apontamentosExtras ?? []));

  // Regras que dependem do cadastro da Receita.
  if (d) {
    apontamentos.push(...analisarNome(d, nome));
    apontamentos.push(...analisarSituacaoCadastral(d));
    apontamentos.push(...analisarIdade(d, valorReferencia));
    apontamentos.push(...analisarRepresentante(d, representante));
  } else if (tipo === "PJ") {
    apontamentos.push({
      gravidade: "MEDIA",
      eixo: "CADASTRO",
      titulo: "Cadastro da Receita não obtido",
      detalhe:
        "Sem o cadastro da Receita não é possível confirmar existência, situação e porte da empresa. " +
        "Repita a auditoria ou junte o comprovante de inscrição emitido no site da Receita Federal.",
      fonte: "Receita Federal",
    });
  }

  if (tipo === "PF") {
    apontamentos.push({
      gravidade: "INFO",
      eixo: "CAPACIDADE",
      titulo: "Pessoa física: verificação limitada",
      detalhe:
        "Não há base pública gratuita que informe a situação financeira de pessoa física. A análise de " +
        "capacidade depende de bureau de crédito contratado, ou da apresentação de documentos pela própria " +
        "parte: declaração de imposto de renda, extratos, certidões de protesto e de distribuição cível.",
      fonte: "Sistema",
    });
  }

  if (pep) {
    apontamentos.push({
      gravidade: "MEDIA",
      eixo: "IDONEIDADE",
      titulo: "Pessoa exposta politicamente",
      detalhe:
        "A parte está marcada como PEP. A Lei 9.613/1998 exige diligência reforçada: registre a origem dos " +
        "recursos, guarde a documentação e mantenha o acompanhamento da operação.",
      fonte: "Cadastro interno",
    });
  }

  const { capacidade, apontamentos: deCapacidade } = analisarCapacidade(d, valorReferencia);
  apontamentos.push(...deCapacidade);

  const idoneidade = classificarIdoneidade(apontamentos);

  const desconto = apontamentos.reduce((total, a) => total + (PESO[a.gravidade] ?? 0), 0);
  const pontuacao = Math.max(0, Math.min(100, 100 - desconto));

  const indisponiveis = fontes
    .filter((f) => f.status === "INDISPONIVEL")
    .map((f) => f.resumo)
    .filter((r, i, lista) => lista.indexOf(r) === i);

  // Ordena do mais grave para o menos grave: quem abre a tela vê o que importa.
  const ordem = { GRAVE: 0, MEDIA: 1, BAIXA: 2, INFO: 3 };
  apontamentos.sort((a, b) => ordem[a.gravidade] - ordem[b.gravidade]);

  return {
    idoneidade,
    capacidade,
    pontuacao,
    parecer: montarParecer(nome, idoneidade, capacidade, apontamentos, d, valorReferencia, indisponiveis),
    apontamentos,
    dadosCadastrais: d,
    fontes,
    fontesIndisponiveis: indisponiveis,
    valorReferencia,
  };
}
