/**
 * Chaves de configuração da administração.
 *
 * Ficam fora de `acoes.ts` porque um arquivo marcado com "use server" só pode
 * exportar funções async — constante exportada de lá quebra o build (e o
 * typecheck não avisa, só o `next build`).
 */
export const CHAVE_RENOVACAO_IA = "ia.renovacao";
export const CHAVE_SALDO_IA = "ia.saldo_informado";
