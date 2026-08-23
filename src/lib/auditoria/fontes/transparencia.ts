/**
 * Cadastros oficiais de empresas punidas (Portal da Transparência — CGU).
 *
 * É aqui que "idôneo" deixa de ser opinião e vira fato registrado:
 *
 *   CEIS  — Cadastro de Empresas Inidôneas e Suspensas. Quem está aqui foi
 *           declarado inidôneo ou suspenso para contratar com a administração
 *           pública (Lei 14.133/2021, antiga Lei 8.666).
 *   CNEP  — Cadastro Nacional de Empresas Punidas pela Lei Anticorrupção
 *           (Lei 12.846/2013).
 *   CEPIM — Entidades privadas sem fins lucrativos impedidas de firmar
 *           convênios com a União.
 *
 * A chave da API é gratuita: cadastre um e-mail em
 * https://api.portaldatransparencia.gov.br/swagger-ui.html e coloque em
 * TRANSPARENCIA_API_KEY no .env. Sem ela, a fonte se declara indisponível em
 * vez de fingir que consultou.
 */
import type { Apontamento, ResultadoFonte } from "../tipos";
import { somenteNumeros } from "@/lib/validacao";

const BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";
const TEMPO_LIMITE = 15000;

type Cadastro = { chave: string; caminho: string; nome: string; gravidade: "GRAVE" | "MEDIA" };

const CADASTROS: Cadastro[] = [
  { chave: "CEIS", caminho: "ceis", nome: "CEIS — Empresas Inidôneas e Suspensas", gravidade: "GRAVE" },
  { chave: "CNEP", caminho: "cnep", nome: "CNEP — Punidas pela Lei Anticorrupção", gravidade: "GRAVE" },
  { chave: "CEPIM", caminho: "cepim", nome: "CEPIM — Impedidas de firmar convênios", gravidade: "MEDIA" },
];

function chaveApi(): string | null {
  return (process.env.TRANSPARENCIA_API_KEY ?? "").trim() || null;
}

function indisponivel(motivo: string): ResultadoFonte[] {
  return CADASTROS.map((c) => ({
    fonte: c.chave,
    status: "INDISPONIVEL" as const,
    resumo: motivo,
    apontamentos: [],
  }));
}

async function consultarCadastro(cadastro: Cadastro, documento: string, chave: string): Promise<ResultadoFonte> {
  // A API aceita o documento do sancionado; o mesmo parâmetro serve para
  // CPF e CNPJ conforme o tamanho.
  const parametro = documento.length === 11 ? "cpfSancionado" : "cnpjSancionado";
  const url = `${BASE}/${cadastro.caminho}?${parametro}=${documento}&pagina=1`;

  try {
    const resposta = await fetch(url, {
      headers: { "chave-api-dados": chave, Accept: "application/json" },
      signal: AbortSignal.timeout(TEMPO_LIMITE),
    });

    if (resposta.status === 401 || resposta.status === 403) {
      return {
        fonte: cadastro.chave,
        status: "INDISPONIVEL",
        resumo: "Chave do Portal da Transparência recusada.",
        erro: `HTTP ${resposta.status}`,
        apontamentos: [],
      };
    }

    if (!resposta.ok) {
      return {
        fonte: cadastro.chave,
        status: "ERRO",
        resumo: `${cadastro.nome}: consulta não concluída.`,
        erro: `HTTP ${resposta.status}`,
        apontamentos: [],
      };
    }

    const dados = (await resposta.json()) as unknown;
    const registros = Array.isArray(dados) ? dados : [];

    if (registros.length === 0) {
      return {
        fonte: cadastro.chave,
        status: "CONCLUIDA",
        resumo: `Nada consta no ${cadastro.chave}.`,
        resultado: { registros: 0 },
        apontamentos: [],
      };
    }

    const apontamento: Apontamento = {
      gravidade: cadastro.gravidade,
      eixo: "IDONEIDADE",
      titulo: `Consta no ${cadastro.chave}`,
      detalhe:
        `A parte aparece em ${registros.length} registro(s) do ${cadastro.nome}. ` +
        (cadastro.chave === "CEIS"
          ? "Empresa declarada inidônea ou suspensa para contratar com a administração pública. " +
            "Se o ativo negociado depende de ente público — precatório é o caso —, isso compromete a operação."
          : cadastro.chave === "CNEP"
            ? "Empresa punida pela Lei Anticorrupção. Verifique a vigência da punição e o alcance dos efeitos."
            : "Entidade impedida de firmar convênios com a União.") +
        " Consulte o detalhe no Portal da Transparência antes de decidir.",
      fonte: cadastro.nome,
    };

    return {
      fonte: cadastro.chave,
      status: "CONCLUIDA",
      resumo: `${registros.length} registro(s) no ${cadastro.chave}.`,
      resultado: { registros: registros.length, dados: registros.slice(0, 5) },
      apontamentos: [apontamento],
    };
  } catch (erro) {
    return {
      fonte: cadastro.chave,
      status: "ERRO",
      resumo: `${cadastro.nome}: consulta não concluída.`,
      erro: (erro as Error).message,
      apontamentos: [],
    };
  }
}

/** Consulta os três cadastros de uma vez. */
export async function consultarPunicoes(documento: string): Promise<ResultadoFonte[]> {
  const limpo = somenteNumeros(documento);
  if (limpo.length !== 11 && limpo.length !== 14) {
    return indisponivel("Documento em formato não aceito por esta consulta.");
  }

  const chave = chaveApi();
  if (!chave) {
    return indisponivel(
      "Cadastro de empresas punidas não consultado: falta a chave gratuita do Portal da Transparência."
    );
  }

  return Promise.all(CADASTROS.map((c) => consultarCadastro(c, limpo, chave)));
}
