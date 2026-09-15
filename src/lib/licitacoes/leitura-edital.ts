/**
 * Leitura automática do edital por IA.
 *
 * O PDF do edital vai direto para a IA em base64 (mesmo mecanismo de
 * `lerComIa` em src/app/verificacao/painel/documentos/acoes.ts) — não há
 * extração local de texto de PDF no projeto. A IA não inventa uma sexta
 * categoria: classifica cada exigência encontrada dentro das cinco categorias
 * fechadas de src/lib/licitacoes/requisitos.ts, e usa "NAO_IDENTIFICADA"
 * quando não conseguir classificar com segurança. O que não bate com o
 * catálogo conhecido (`DOCUMENTOS_HABILITACAO`) fica com `chaveReconhecida`
 * nula, para conferência humana — nunca forçado numa chave errada.
 *
 * Isto é conferência, não preenchimento automático: não sobrescreve os
 * campos que o usuário já digitou (órgão, modalidade, número, objeto).
 */
import { perguntarJson, iaConfigurada, type BlocoConteudo } from "@/lib/ia/claude";
import { CATEGORIAS_HABILITACAO, DOCUMENTOS_HABILITACAO, type CategoriaHabilitacao } from "./requisitos";

export type RequisitoExtraido = {
  /** Como o edital descreve a exigência, resumido — não cópia literal extensa. */
  descricao: string;
  categoria: CategoriaHabilitacao | "NAO_IDENTIFICADA";
  /** Chave de DOCUMENTOS_HABILITACAO, quando o item bater com o catálogo conhecido. */
  chaveReconhecida: string | null;
};

export type LeituraEdital = {
  orgaoLicitante: string | null;
  modalidade: string | null;
  numeroCertame: string | null;
  objeto: string | null;
  /** Data limite de envio de proposta/documentos, como o edital descrever. */
  prazoEnvio: string | null;
  requisitos: RequisitoExtraido[];
};

const CATALOGO_TEXTO = DOCUMENTOS_HABILITACAO.map((d) => `${d.chave}: ${d.nome} (categoria ${d.categoria})`).join("\n");

const CATEGORIAS_TEXTO = (Object.keys(CATEGORIAS_HABILITACAO) as CategoriaHabilitacao[])
  .map((c) => `${c}: ${CATEGORIAS_HABILITACAO[c].nome} — ${CATEGORIAS_HABILITACAO[c].fundamento}`)
  .join("\n");

const INSTRUCAO = `Você lê editais de licitação pública brasileira (Lei nº 8.666/1993 ou Lei nº 14.133/2021) para uma plataforma que ajuda empresas a se habilitarem.

Extraia do PDF recebido:
1. Órgão licitante, modalidade, número do certame, objeto resumido, e o prazo final de envio de proposta/documentos (se o edital tiver essa data).
2. A lista de exigências de HABILITAÇÃO do edital (não confunda com exigências de proposta técnica/comercial ou critérios de julgamento) — cada uma classificada numa destas cinco categorias fechadas, e SOMENTE nestas:

${CATEGORIAS_TEXTO}

Para cada exigência, tente reconhecê-la contra este catálogo de documentos comuns:

${CATALOGO_TEXTO}

REGRAS QUE NÃO PODEM SER QUEBRADAS:
1. Baseie-se SOMENTE no texto do edital recebido. Nunca invente exigência que não está no documento.
2. Use "NAO_IDENTIFICADA" como categoria quando não conseguir classificar a exigência com segurança dentro das cinco categorias — nunca invente uma sexta categoria.
3. Só preencha "chaveReconhecida" com uma chave do catálogo acima quando a exigência do edital corresponder de verdade ao documento listado. Quando a exigência for parecida mas não igual, ou não estiver no catálogo, deixe "chaveReconhecida" como null — a plataforma trata isso como algo para conferência humana, nunca força numa chave errada.
4. Quando um campo de metadado (órgão, modalidade, número, objeto, prazo) não estiver claro no documento, responda null para ele — nunca invente.

Responda SOMENTE com um objeto JSON, sem texto antes ou depois, neste formato exato:
{
  "orgaoLicitante": "..." ou null,
  "modalidade": "..." ou null,
  "numeroCertame": "..." ou null,
  "objeto": "..." ou null,
  "prazoEnvio": "..." ou null,
  "requisitos": [ { "descricao": "...", "categoria": "JURIDICA|TECNICA|ECONOMICO_FINANCEIRA|FISCAL_TRABALHISTA|TRABALHO_MENOR|NAO_IDENTIFICADA", "chaveReconhecida": "..." ou null } ]
}`;

function blocoDoArquivo(bytes: Buffer, tipo: string): BlocoConteudo | null {
  if (tipo === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") } };
  }
  if (tipo.startsWith("image/")) {
    return { type: "image", source: { type: "base64", media_type: tipo, data: bytes.toString("base64") } };
  }
  return null;
}

export type ResultadoLeituraEdital = { ok: true; leitura: LeituraEdital } | { ok: false; erro: string };

export async function lerEdital(params: {
  arquivo: Buffer;
  arquivoTipo: string;
  contexto?: { solucao?: string; contaId?: string; referencia?: string };
}): Promise<ResultadoLeituraEdital> {
  if (!iaConfigurada()) {
    return { ok: false, erro: "Inteligência artificial não configurada (ANTHROPIC_API_KEY)." };
  }

  const bloco = blocoDoArquivo(params.arquivo, params.arquivoTipo);
  if (!bloco) {
    return { ok: false, erro: "Tipo de arquivo não suportado para leitura por IA (aceita PDF ou imagem)." };
  }

  const resposta = await perguntarJson<Record<string, unknown>>({
    instrucao: INSTRUCAO,
    conteudo: [bloco],
    maxTokens: 8000,
    contexto: params.contexto,
  });

  if (!resposta.ok) return { ok: false, erro: resposta.erro };

  const d = resposta.dados;
  const chavesValidas = new Set(DOCUMENTOS_HABILITACAO.map((doc) => doc.chave));
  const categoriasValidas = new Set([...Object.keys(CATEGORIAS_HABILITACAO), "NAO_IDENTIFICADA"]);

  const requisitos: RequisitoExtraido[] = Array.isArray(d.requisitos)
    ? (d.requisitos as Array<Record<string, unknown>>)
        .filter((r) => r && typeof r.descricao === "string")
        .map((r) => ({
          descricao: r.descricao as string,
          categoria: categoriasValidas.has(r.categoria as string) ? (r.categoria as RequisitoExtraido["categoria"]) : "NAO_IDENTIFICADA",
          chaveReconhecida: typeof r.chaveReconhecida === "string" && chavesValidas.has(r.chaveReconhecida) ? r.chaveReconhecida : null,
        }))
    : [];

  const leitura: LeituraEdital = {
    orgaoLicitante: typeof d.orgaoLicitante === "string" ? d.orgaoLicitante : null,
    modalidade: typeof d.modalidade === "string" ? d.modalidade : null,
    numeroCertame: typeof d.numeroCertame === "string" ? d.numeroCertame : null,
    objeto: typeof d.objeto === "string" ? d.objeto : null,
    prazoEnvio: typeof d.prazoEnvio === "string" ? d.prazoEnvio : null,
    requisitos,
  };

  return { ok: true, leitura };
}
