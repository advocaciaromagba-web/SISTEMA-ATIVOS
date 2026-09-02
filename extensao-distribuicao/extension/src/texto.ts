// Faixa Unicode dos sinais diacríticos combinantes (acento, til, cedilha
// depois de NFD). Escrito como números, não como escape \u, para não
// depender de como o editor trata caracteres invisíveis no código-fonte.
const INICIO_DIACRITICOS = 0x0300;
const FIM_DIACRITICOS = 0x036f;

export function removerDiacriticos(valor: string): string {
  let resultado = "";
  for (const caractere of valor.normalize("NFD")) {
    const codigo = caractere.codePointAt(0) ?? 0;
    if (codigo >= INICIO_DIACRITICOS && codigo <= FIM_DIACRITICOS) continue;
    resultado += caractere;
  }
  return resultado;
}

/** Normaliza para comparação "tolerante": sem acento, sem caixa, sem
 * espaço nas pontas. Usado para casar rótulo de campo do tribunal com o
 * texto que o adaptador está procurando, já que cada tribunal escreve o
 * mesmo rótulo de um jeito um pouco diferente. */
export function normalizarTexto(valor: string): string {
  return removerDiacriticos(valor).toLowerCase().trim();
}
