/**
 * Cadastro Nacional da Pessoa Jurídica (Receita Federal).
 *
 * É a fonte mais importante da auditoria e não custa nada: diz se a empresa
 * existe, se está ativa, desde quando, quanto declarou de capital, qual o porte
 * e quem são os sócios. Metade dos problemas de uma operação aparece aqui.
 *
 * Consultamos dois espelhos públicos do mesmo dado da Receita. Se o primeiro
 * falhar, cai no segundo — fonte gratuita cai, e uma auditoria que não roda é
 * pior que uma auditoria incompleta.
 */
import type { DadosCadastrais, ResultadoFonte } from "../tipos";
import { somenteNumeros } from "@/lib/validacao";

const ESPELHOS = [
  { nome: "BrasilAPI", url: (cnpj: string) => `https://brasilapi.com.br/api/cnpj/v1/${cnpj}` },
  { nome: "Minha Receita", url: (cnpj: string) => `https://minhareceita.org/${cnpj}` },
];

const TEMPO_LIMITE = 15000;

/** Situação cadastral pelo código da Receita. */
const SITUACOES: Record<number, string> = {
  1: "NULA",
  2: "ATIVA",
  3: "SUSPENSA",
  4: "INAPTA",
  8: "BAIXADA",
};

type RespostaReceita = Record<string, unknown>;

function normalizar(d: RespostaReceita): DadosCadastrais {
  const texto = (chave: string) => {
    const v = d[chave];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const numero = (chave: string) => {
    const v = d[chave];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const codigoSituacao = numero("situacao_cadastral");
  const situacao = texto("descricao_situacao_cadastral") ?? (codigoSituacao != null ? SITUACOES[codigoSituacao] ?? null : null);

  const qsa = Array.isArray(d.qsa) ? (d.qsa as Array<Record<string, unknown>>) : [];

  return {
    razaoSocial: texto("razao_social"),
    nomeFantasia: texto("nome_fantasia"),
    situacao,
    motivoSituacao: texto("descricao_motivo_situacao_cadastral"),
    dataSituacao: texto("data_situacao_cadastral"),
    dataAbertura: texto("data_inicio_atividade"),
    capitalSocial: numero("capital_social"),
    porte: texto("porte") ?? texto("descricao_porte"),
    naturezaJuridica: texto("natureza_juridica"),
    atividadePrincipal: texto("cnae_fiscal_descricao"),
    optanteSimples: typeof d.opcao_pelo_simples === "boolean" ? d.opcao_pelo_simples : null,
    optanteMei: typeof d.opcao_pelo_mei === "boolean" ? d.opcao_pelo_mei : null,
    matriz: texto("descricao_identificador_matriz_filial") === "MATRIZ",
    municipio: texto("municipio"),
    uf: texto("uf"),
    socios: qsa.map((s) => ({
      nome: String(s.nome_socio ?? "").trim(),
      documento: s.cnpj_cpf_do_socio ? String(s.cnpj_cpf_do_socio) : null,
      qualificacao: s.qualificacao_socio ? String(s.qualificacao_socio) : null,
      desde: s.data_entrada_sociedade ? String(s.data_entrada_sociedade) : null,
    })),
  };
}

export async function consultarReceita(
  cnpj: string
): Promise<ResultadoFonte & { dados: DadosCadastrais | null }> {
  const limpo = somenteNumeros(cnpj);

  // O CNPJ alfanumérico ainda não é aceito por estes espelhos, que consultam a
  // base pelo número. Avisamos em vez de devolver um erro sem explicação.
  if (limpo.length !== 14) {
    return {
      fonte: "RECEITA_CNPJ",
      status: "INDISPONIVEL",
      resumo: "Consulta à Receita indisponível para este formato de CNPJ.",
      apontamentos: [
        {
          gravidade: "MEDIA",
          eixo: "CADASTRO",
          titulo: "Cadastro da Receita não consultado",
          detalhe:
            "As bases públicas usadas ainda consultam apenas o CNPJ numérico. Confirme a situação cadastral " +
            "diretamente no site da Receita Federal e anexe o comprovante à operação.",
          fonte: "Receita Federal",
        },
      ],
      dados: null,
    };
  }

  const erros: string[] = [];

  for (const espelho of ESPELHOS) {
    try {
      const resposta = await fetch(espelho.url(limpo), {
        headers: { "User-Agent": "SistemaAtivos/1.0", Accept: "application/json" },
        signal: AbortSignal.timeout(TEMPO_LIMITE),
      });

      if (resposta.status === 404) {
        return {
          fonte: "RECEITA_CNPJ",
          status: "CONCLUIDA",
          resumo: "CNPJ não encontrado na base da Receita Federal.",
          resultado: { espelho: espelho.nome, encontrado: false },
          apontamentos: [
            {
              gravidade: "GRAVE",
              eixo: "IDONEIDADE",
              titulo: "CNPJ não existe na Receita Federal",
              detalhe:
                "O número informado não consta na base da Receita. Confira a digitação; se estiver correta, a " +
                "empresa não existe e a operação não deve prosseguir.",
              fonte: "Receita Federal",
            },
          ],
          dados: null,
        };
      }

      if (!resposta.ok) {
        erros.push(`${espelho.nome}: HTTP ${resposta.status}`);
        continue;
      }

      const bruto = (await resposta.json()) as RespostaReceita;
      const dados = normalizar(bruto);

      return {
        fonte: "RECEITA_CNPJ",
        status: "CONCLUIDA",
        resumo: `${dados.razaoSocial ?? "Empresa"} — situação ${dados.situacao ?? "não informada"}.`,
        resultado: { espelho: espelho.nome, dados, bruto },
        apontamentos: [],
        dados,
      };
    } catch (erro) {
      erros.push(`${espelho.nome}: ${(erro as Error).message}`);
    }
  }

  return {
    fonte: "RECEITA_CNPJ",
    status: "ERRO",
    resumo: "Não foi possível consultar a Receita Federal agora.",
    erro: erros.join(" | "),
    apontamentos: [
      {
        gravidade: "MEDIA",
        eixo: "CADASTRO",
        titulo: "Consulta à Receita não concluída",
        detalhe:
          "As bases públicas não responderam. Repita a auditoria em alguns minutos — sem o cadastro da Receita, " +
          "a análise de idoneidade e de capacidade fica incompleta.",
        fonte: "Receita Federal",
      },
    ],
    dados: null,
  };
}
