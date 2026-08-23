/**
 * Adaptador genérico, para qualquer bureau que devolva JSON.
 *
 * Serve para BigDataCorp, Direct Data, Assertiva e semelhantes: informe a URL
 * do endpoint (com {documento} onde entra o CPF/CNPJ) e a chave, e o sistema
 * tenta reconhecer os campos pelos nomes mais comuns.
 *
 * É um começo, não uma integração fechada: depois da primeira consulta real,
 * confira o dossiê e acerte os caminhos em `mapear`.
 */
import {
  booleanoDe,
  buscar,
  contarDe,
  numeroDe,
  textoDe,
  LEITURA_VAZIA,
  type AdaptadorBureau,
  type LeituraBureau,
} from "./tipos";

const TEMPO_LIMITE = 25000;

function config() {
  const ler = (chave: string) => (process.env[chave] ?? "").trim();
  return {
    url: ler("BUREAU_API_URL"),
    chave: ler("BUREAU_API_KEY"),
    provedor: ler("BUREAU_PROVEDOR") || "bureau",
    /** "bearer" (padrão), "apikey" ou o nome do cabeçalho a usar. */
    autenticacao: ler("BUREAU_AUTENTICACAO") || "bearer",
  };
}

function mapear(bruto: unknown): LeituraBureau {
  const b = bruto;

  return {
    ...LEITURA_VAZIA,
    score: numeroDe(buscar(b, "score", "creditScore", "pontuacao", "score.valor")),
    scoreMaximo: numeroDe(buscar(b, "scoreMaximo", "score.maximo")) ?? 1000,
    scoreFaixa: textoDe(buscar(b, "faixa", "classificacao", "score.faixa")),

    pendenciasFinanceiras: contarDe(buscar(b, "pendencias", "pendenciasFinanceiras", "negativacoes")),
    valorPendencias: numeroDe(buscar(b, "valorPendencias", "valorNegativacoes", "totalPendencias")),

    protestos: contarDe(buscar(b, "protestos", "protesto.quantidade")),
    valorProtestos: numeroDe(buscar(b, "valorProtestos", "protesto.valorTotal")),

    chequesSemFundo: contarDe(buscar(b, "chequesSemFundo", "ccf")),
    dividaAtiva: contarDe(buscar(b, "dividaAtiva")),
    valorDividaAtiva: numeroDe(buscar(b, "valorDividaAtiva")),

    falencia: booleanoDe(buscar(b, "falencia", "falencias")),
    recuperacaoJudicial: booleanoDe(buscar(b, "recuperacaoJudicial", "recuperacao")),
    situacaoReceita: textoDe(buscar(b, "situacaoCadastral", "situacaoReceita")),

    acoesJudiciais: contarDe(buscar(b, "acoesJudiciais", "processos")),
    valorAcoesJudiciais: numeroDe(buscar(b, "valorAcoesJudiciais", "valorProcessos")),

    faturamentoPresumido: numeroDe(buscar(b, "faturamentoPresumido", "faturamento")),
    limiteCreditoSugerido: numeroDe(buscar(b, "limiteCredito", "limiteCreditoSugerido")),

    consultasUltimos90Dias: contarDe(buscar(b, "consultas", "consultasRecentes")),
    participacoesSocietarias: contarDe(buscar(b, "participacoes", "participacoesSocietarias")),

    posicaoEm: textoDe(buscar(b, "dataConsulta", "posicaoEm", "data")),
  };
}

export const adaptadorGenerico: AdaptadorBureau = {
  get nome() {
    return config().provedor;
  },

  configurado() {
    const c = config();
    return Boolean(c.url && c.chave);
  },

  async consultar(documento) {
    const c = config();

    const cabecalhos: Record<string, string> = { Accept: "application/json" };
    if (c.autenticacao.toLowerCase() === "bearer") {
      cabecalhos.Authorization = `Bearer ${c.chave}`;
    } else if (c.autenticacao.toLowerCase() === "apikey") {
      cabecalhos["x-api-key"] = c.chave;
    } else {
      // Qualquer outro valor é tratado como o nome do cabeçalho.
      cabecalhos[c.autenticacao] = c.chave;
    }

    const resposta = await fetch(c.url.replace("{documento}", documento), {
      headers: cabecalhos,
      signal: AbortSignal.timeout(TEMPO_LIMITE),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      throw new Error(`HTTP ${resposta.status} ${corpo.slice(0, 200)}`);
    }

    const bruto = await resposta.json();
    return { leitura: mapear(bruto), bruto };
  },
};
