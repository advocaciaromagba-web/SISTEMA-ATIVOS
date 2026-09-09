/**
 * Leitura por IA dos documentos de apoio anexados ao contrato — OAB do
 * advogado, laudo técnico de frustração de safra, laudo de capacidade de
 * pagamento. Mesmo princípio de `leitura-contrato.ts`: a IA só extrai fatos
 * que estejam escritos no documento, para revisão humana campo a campo —
 * nunca decide nada sozinha, e nunca completa o que não está lá.
 */
import { iaConfigurada, perguntarJson, type BlocoConteudo } from "@/lib/ia/claude";

export type TipoAnexo = "OAB_ADVOGADO" | "LAUDO_FRUSTRACAO_SAFRA" | "LAUDO_CAPACIDADE_PAGAMENTO" | "OUTRO";

export const ROTULO_TIPO_ANEXO: Record<TipoAnexo, string> = {
  OAB_ADVOGADO: "Comprovante de inscrição na OAB",
  LAUDO_FRUSTRACAO_SAFRA: "Laudo técnico de frustração de safra",
  LAUDO_CAPACIDADE_PAGAMENTO: "Laudo de capacidade de pagamento",
  OUTRO: "Outro documento de apoio",
};

/**
 * Campos que algum anexo pode sugerir — a mesma forma para os três tipos,
 * porque a tela de revisão é uma só. Cada tipo só preenche os campos que
 * fazem sentido para ele; os demais ficam vazios.
 */
export type RascunhoAnexo = {
  // OAB
  advogadoNome?: string;
  advogadoOab?: string;
  // laudo de frustração de safra
  numeroSafrasComPerda?: number;
  anosSafrasComPerda?: string[];
  percentualReducaoRenda?: number;
  causaPerda?: "CLIMATICO" | "PRECO" | "AMBOS";
  eventosClimaticos?: string[];
  profissionalHabilitadoNome?: string;
  profissionalHabilitadoRegistro?: string;
  // laudo de capacidade de pagamento
  capacidadePagamentoComprometida?: boolean;
  capacidadePagamentoResumo?: string;
};

const INSTRUCAO_POR_TIPO: Record<Exclude<TipoAnexo, "OUTRO">, string> = {
  OAB_ADVOGADO:
    "Você lê comprovantes de inscrição na OAB (carteira, certidão de regularidade). Extraia só o que estiver " +
    "escrito, sem inferir. Responda só em JSON com: advogadoNome (nome completo), advogadoOab (número e UF, " +
    'formato "123456/SP"). Se algum campo não aparecer no documento, omita-o.',

  LAUDO_FRUSTRACAO_SAFRA:
    "Você lê laudos técnicos de frustração de safra (perda de produção agrícola por evento climático ou queda de " +
    "preço), para um advogado revisar depois — nunca decida se o caso se enquadra em nenhuma lei, isso é feito " +
    "por outro sistema. Extraia só o que estiver escrito no laudo, sem inferir ou completar. Responda só em JSON " +
    "com: numeroSafrasComPerda (quantas safras tiveram perda), anosSafrasComPerda (lista de anos, como texto), " +
    "percentualReducaoRenda (número, % de redução da renda bruta esperada), causaPerda (CLIMATICO|PRECO|AMBOS, " +
    "só se estiver explícito), eventosClimaticos (lista de texto: seca, geada, granizo etc.), " +
    "profissionalHabilitadoNome, profissionalHabilitadoRegistro (CREA, CRMV etc.), capacidadePagamentoResumo " +
    "(um resumo objetivo, em até 4 frases, da conclusão técnica do laudo sobre o impacto da perda). Se um campo " +
    "não aparecer no laudo, omita-o — não invente valor.",

  LAUDO_CAPACIDADE_PAGAMENTO:
    "Você lê laudos ou análises de capacidade de pagamento de produtor rural (fluxo de caixa, comparação de " +
    "renda antes/depois de um evento, parecer contábil ou técnico sobre a viabilidade de honrar a dívida), para " +
    "um advogado revisar depois — nunca decida nada sozinho. Extraia só o que estiver escrito no documento, sem " +
    "inferir. Responda só em JSON com: capacidadePagamentoComprometida (booleano — o documento conclui que a " +
    "capacidade de pagamento está comprometida?), capacidadePagamentoResumo (um resumo objetivo, em até 5 " +
    "frases, da conclusão do documento — números concretos quando existirem, sem arredondar nem estimar o que " +
    "não estiver escrito). Se a conclusão não estiver clara, omita capacidadePagamentoComprometida.",
};

export async function lerAnexoComIa(
  tipo: TipoAnexo,
  arquivo: Buffer,
  tipoArquivo: string | null,
  contaId?: string | null
): Promise<{ dados: RascunhoAnexo | null; erro: string | null }> {
  if (!iaConfigurada()) return { dados: null, erro: "IA não configurada (ANTHROPIC_API_KEY)." };
  if (tipo === "OUTRO") return { dados: null, erro: "Este tipo de anexo não tem leitura automática — anexe e preencha à mão." };

  let bloco: BlocoConteudo | null = null;
  if (tipoArquivo === "application/pdf") {
    bloco = { type: "document", source: { type: "base64", media_type: "application/pdf", data: arquivo.toString("base64") } };
  } else if (tipoArquivo && tipoArquivo.startsWith("image/")) {
    bloco = { type: "image", source: { type: "base64", media_type: tipoArquivo, data: arquivo.toString("base64") } };
  } else {
    return { dados: null, erro: "Formato de arquivo não suportado para leitura por IA (use PDF ou imagem)." };
  }

  const resposta = await perguntarJson<RascunhoAnexo>({
    instrucao: INSTRUCAO_POR_TIPO[tipo],
    conteudo: [bloco],
    contexto: { solucao: "AGROJUD", contaId: contaId ?? null, referencia: `Leitura de anexo — ${ROTULO_TIPO_ANEXO[tipo]}` },
    // Mesma folga do contrato: laudo técnico pode ser longo, e o corte de
    // resposta por falta de espaço já quebrou a leitura do contrato uma vez
    // (ver src/lib/ia/claude.ts) — não repetir o erro aqui.
    maxTokens: 8000,
  });

  if (!resposta.ok) return { dados: null, erro: resposta.erro };
  return { dados: resposta.dados, erro: null };
}
