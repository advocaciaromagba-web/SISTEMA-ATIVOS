/**
 * Leitura do PDF do contrato por IA — só um rascunho para o advogado revisar
 * e confirmar campo a campo. A IA nunca decide enquadramento: ela só tenta
 * extrair os fatos que o motor determinístico (mp1376.ts, credito-rural.ts)
 * depois avalia contra o texto da lei.
 */
import { iaConfigurada, perguntarJson, type BlocoConteudo } from "@/lib/ia/claude";

export type RascunhoContrato = {
  mutuarioNome?: string;
  mutuarioDocumento?: string;
  instituicaoFinanceira?: string;
  numeroContrato?: string;
  dataContratacao?: string;
  categoriaOperacao?: "CUSTEIO" | "COMERCIALIZACAO" | "INDUSTRIALIZACAO" | "INVESTIMENTO";
  valorOperacao?: number;
  taxaJurosContratual?: number;
  indexador?: string;
  encargosMoratorios?: string;
  tiposGarantia?: string[];
  garantiasDescricao?: string;
  avalistas?: Array<{ nome?: string; documento?: string; patrimonioDescrito?: string }>;
  temSeguroRural?: boolean;
  seguradora?: string;
  apoliceNumero?: string;
  coberturas?: string[];
  riscosIdentificados?: string[];
};

export async function lerContratoComIa(arquivo: Buffer, tipoArquivo: string | null): Promise<{ dados: RascunhoContrato | null; erro: string | null }> {
  if (!iaConfigurada()) return { dados: null, erro: "IA não configurada (ANTHROPIC_API_KEY)." };

  let bloco: BlocoConteudo | null = null;
  if (tipoArquivo === "application/pdf") {
    bloco = { type: "document", source: { type: "base64", media_type: "application/pdf", data: arquivo.toString("base64") } };
  } else if (tipoArquivo && tipoArquivo.startsWith("image/")) {
    bloco = { type: "image", source: { type: "base64", media_type: tipoArquivo, data: arquivo.toString("base64") } };
  } else {
    return { dados: null, erro: "Formato de arquivo não suportado para leitura por IA (use PDF ou imagem)." };
  }

  const resposta = await perguntarJson<RascunhoContrato>({
    instrucao:
      "Você lê contratos de crédito rural brasileiros e extrai fatos objetivos, para um advogado revisar depois " +
      "— nunca decida se o contrato se enquadra em nenhuma lei, isso é feito por outro sistema. Extraia só o que " +
      "estiver escrito no contrato, sem inferir ou completar. Se um campo não aparecer no documento, omita-o " +
      "(não invente valor). Responda só em JSON com os campos: mutuarioNome, mutuarioDocumento (CPF/CNPJ), " +
      "instituicaoFinanceira, numeroContrato, dataContratacao (YYYY-MM-DD), categoriaOperacao (CUSTEIO| " +
      "COMERCIALIZACAO|INDUSTRIALIZACAO|INVESTIMENTO, só se estiver explícito), valorOperacao (número), " +
      "taxaJurosContratual (número, % ao ano), indexador (texto), encargosMoratorios (texto), tiposGarantia " +
      "(lista de texto: HIPOTECA, PENHOR, ALIENACAO_FIDUCIARIA, AVAL, FIANCA, CPR ou OUTRA), garantiasDescricao " +
      "(texto), avalistas (lista de {nome, documento, patrimonioDescrito}), temSeguroRural (booleano), " +
      "seguradora, apoliceNumero, coberturas (lista de texto), riscosIdentificados (lista de texto — cláusulas " +
      "que pareçam desequilibradas, onerosas ou incomuns, descritas objetivamente).",
    conteudo: [bloco],
    maxTokens: 4000,
  });

  if (!resposta.ok) return { dados: null, erro: resposta.erro };
  return { dados: resposta.dados, erro: null };
}
