import type { Prisma } from "@prisma/client";

/**
 * Escreve um valor já tipado num campo `Json?` do Prisma. O TypeScript não
 * aceita um objeto/array de domínio (ex.: `ResultadoGarantias`) direto num
 * campo `InputJsonValue` sem esta conversão — mas isso é diferente de
 * `as never`, que apaga toda checagem do valor (inclusive erros de
 * digitação óbvios, como passar o resultado do motor errado). `paraJson`
 * limita a conversão ao ponto exato onde ela é necessária.
 */
export function paraJson<T>(valor: T): Prisma.InputJsonValue {
  return valor as unknown as Prisma.InputJsonValue;
}
