/**
 * De qual provedor de IA veio uma chamada — só a partir do nome do modelo
 * gravado em `UsoIa.modelo`, sem precisar de coluna nova nem de migração:
 * todo registro já grava o nome exato do modelo que respondeu.
 *
 * Existe porque o sistema fala com duas IAs (ver `IA_PROVEDOR` em
 * `src/lib/ia/claude.ts`), e o painel de custos precisa comparar as duas.
 */
export type ProvedorIa = "Anthropic" | "OpenAI" | "Outro";

const PREFIXOS_OPENAI = ["gpt", "o1", "o3", "o4", "chatgpt"];

export function provedorDoModelo(modelo: string): ProvedorIa {
  const m = modelo.trim().toLowerCase();
  if (m.startsWith("claude")) return "Anthropic";
  if (PREFIXOS_OPENAI.some((p) => m.startsWith(p))) return "OpenAI";
  return "Outro";
}
