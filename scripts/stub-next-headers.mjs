/**
 * Substituto de `next/headers` para rodar codigo de servidor fora do Next.
 *
 * O registro de auditoria le os cabecalhos da requisicao para gravar o IP de
 * origem. Em script nao existe requisicao — e o proprio registro.ts ja trata
 * isso num try/catch, gravando origem nula. Este substituto so precisa falhar
 * do jeito que ele espera.
 */
export function headers() {
  throw new Error("Fora do ciclo de uma requisicao HTTP.");
}

export function cookies() {
  throw new Error("Fora do ciclo de uma requisicao HTTP.");
}
