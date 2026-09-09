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
  temClausulaCapitalizacao?: boolean;
  periodicidadeCapitalizacao?: "MENSAL" | "SEMESTRAL" | "ANUAL" | "OUTRA";
  multaMoratoriaPercentual?: number;
  temComissaoPermanencia?: boolean;
  comissaoPermanenciaCumulada?: boolean;
  tiposGarantia?: string[];
  garantiasDescricao?: string;
  avalistas?: Array<{ nome?: string; documento?: string; patrimonioDescrito?: string }>;
  temSeguroRural?: boolean;
  seguradora?: string;
  apoliceNumero?: string;
  coberturas?: string[];
  riscosIdentificados?: string[];
};

export async function lerContratoComIa(
  arquivo: Buffer,
  tipoArquivo: string | null,
  /** De quem é este gasto, para a administração separar custo por cliente. */
  contaId?: string | null
): Promise<{ dados: RascunhoContrato | null; erro: string | null }> {
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
      "taxaJurosContratual (número, % ao ano), indexador (texto), encargosMoratorios (texto), " +
      "temClausulaCapitalizacao (booleano — há cláusula expressa de capitalização de juros?), " +
      "periodicidadeCapitalizacao (MENSAL|SEMESTRAL|ANUAL|OUTRA, só se a periodicidade estiver explícita), " +
      "multaMoratoriaPercentual (número, % de multa em caso de mora/cobrança), temComissaoPermanencia " +
      "(booleano — há cobrança de comissão de permanência?), comissaoPermanenciaCumulada (booleano — a comissão " +
      "de permanência está cumulada com correção monetária e/ou juros remuneratórios? só se estiver claro no " +
      "texto), tiposGarantia (lista de texto: HIPOTECA, PENHOR, ALIENACAO_FIDUCIARIA, AVAL, FIANCA, CPR ou " +
      "OUTRA), garantiasDescricao (texto), avalistas (lista de {nome, documento, patrimonioDescrito}), " +
      "temSeguroRural (booleano), seguradora, apoliceNumero, coberturas (lista de texto), riscosIdentificados " +
      "(lista de texto — cláusulas que pareçam desequilibradas, onerosas ou incomuns, descritas objetivamente).",
    conteudo: [bloco],
    contexto: { solucao: "AGROJUD", contaId: contaId ?? null, referencia: "Leitura de contrato de crédito rural" },
    // Cédula de crédito rural real pode ter dezenas de avalistas e cláusulas
    // de garantia longas — 4000 tokens (o padrão do sistema) cortava a
    // resposta no meio do JSON antes de terminar, e a leitura falhava com
    // "formato que o sistema não conseguiu ler". O modelo aceita até 128 mil
    // tokens de saída; 16000 dá folga generosa sem custo extra (só paga pelo
    // que o modelo de fato escrever, não pelo teto).
    maxTokens: 16000,
  });

  if (!resposta.ok) return { dados: null, erro: resposta.erro };
  return { dados: resposta.dados, erro: null };
}
