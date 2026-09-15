/**
 * As regras de conferência de cada documento exigido pelo edital.
 *
 * O edital diz O QUE exigir; a regra de como conferir vem de duas fontes, e
 * é importante que venham separadas:
 *
 *  - O que é da NATUREZA do documento (uma certidão negativa tem prazo de
 *    validade, tem que estar no CNPJ do participante e tem que dizer "nada
 *    consta") sai do catálogo da plataforma. É objetivo, e por isso pode ser
 *    conferido sozinho.
 *  - O que é CONDIÇÃO ESPECÍFICA daquele edital ("atestado compatível em
 *    características e quantidades com o objeto") sai do texto lido do
 *    edital e vai para conferência humana. Não se automatiza juízo de
 *    compatibilidade: chutar aqui reprovaria empresa apta ou habilitaria
 *    inapta, e as duas são graves.
 */
import { CATALOGO_CERTIDOES } from "@/lib/auditoria/certidoes";
import { documentoHabilitacao, type CategoriaHabilitacao } from "./requisitos";
import type { LeituraEdital } from "./leitura-edital";

export type RegraDocumento = {
  chave: string;
  nome: string;
  categoria: CategoriaHabilitacao | "NAO_IDENTIFICADA";
  /** O documento tem que estar em nome do participante. */
  exigeTitularidade: boolean;
  /** Certidão vence; contrato social, não. */
  validadeDias: number | null;
  /** Certidão negativa: "consta" é irregularidade. */
  exigeNadaConsta: boolean;
  orgao: string | null;
  /** Como o edital descreveu a exigência — conferência humana. */
  descricaoNoEdital: string;
};

/** Documentos que são certidão negativa: "consta" é irregularidade. */
const NEGATIVAS = new Set([
  "CERTIDAO_TRIBUTOS_FEDERAIS",
  "CERTIDAO_TRIBUTOS_ESTADUAIS",
  "CERTIDAO_TRIBUTOS_MUNICIPAIS",
  "CERTIDAO_FGTS",
  "CNDT",
  "CERTIDAO_FALENCIA_CONCORDATA",
]);

/**
 * Documentos sem prazo de validade próprio. Contrato social vale enquanto
 * for o vigente; atestado de capacidade técnica não vence.
 */
const SEM_VALIDADE = new Set([
  "CONTRATO_SOCIAL",
  "ATA_ELEICAO_ADMINISTRADORES",
  "REGISTRO_EMPRESARIO_INDIVIDUAL",
  "ATESTADO_CAPACIDADE_TECNICA",
  "REGISTRO_CONSELHO_CLASSE",
  "BALANCO_PATRIMONIAL",
  "DECLARACAO_NAO_EMPREGA_MENOR",
]);

function validadeDoCatalogo(chave: string): number | null {
  if (SEM_VALIDADE.has(chave)) return null;
  const certidao = CATALOGO_CERTIDOES.find((c) => c.chave === chave);
  if (certidao) return certidao.validadeDias;
  // Certidão que o catálogo não conhece: 90 dias é o prazo que a maioria dos
  // editais adota quando o documento não traz o próprio. Fica declarado como
  // suposição na mensagem ao conferir, não como certeza.
  return NEGATIVAS.has(chave) ? 90 : null;
}

export function regrasDoEdital(leitura: LeituraEdital | null): RegraDocumento[] {
  if (!leitura) return [];

  const regras: RegraDocumento[] = [];

  for (const r of leitura.requisitos) {
    if (!r.chaveReconhecida) continue;
    if (regras.some((x) => x.chave === r.chaveReconhecida)) continue;

    const definicao = documentoHabilitacao(r.chaveReconhecida);
    const certidao = CATALOGO_CERTIDOES.find((c) => c.chave === r.chaveReconhecida);

    regras.push({
      chave: r.chaveReconhecida,
      nome: definicao?.nome ?? r.chaveReconhecida,
      categoria: r.categoria,
      exigeTitularidade: true,
      validadeDias: validadeDoCatalogo(r.chaveReconhecida),
      exigeNadaConsta: NEGATIVAS.has(r.chaveReconhecida),
      orgao: certidao?.orgao ?? null,
      descricaoNoEdital: r.descricao,
    });
  }

  return regras;
}

export function regraDoDocumento(regras: RegraDocumento[], tipo: string): RegraDocumento | null {
  return regras.find((r) => r.chave === tipo) ?? null;
}
