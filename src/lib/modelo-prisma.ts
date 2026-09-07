/**
 * Acesso a um model do Prisma pelo nome.
 *
 * O Prisma Client não é indexável por string no tipo. Escrever um `switch` de
 * sete casos em cada tela que precisa falar com "a conta da solução" seria
 * pior de manter do que este ponto único de conversão — então a conversão
 * mora aqui, e só aqui.
 */
import { prisma } from "@/lib/prisma";

export type ModeloGenerico = {
  findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
  findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
  count: (args?: unknown) => Promise<number>;
  create: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
  delete: (args: unknown) => Promise<Record<string, unknown>>;
};

export function modelo(nome: string): ModeloGenerico {
  const cliente = prisma as unknown as Record<string, ModeloGenerico>;
  const m = cliente[nome];
  if (!m) throw new Error(`Model desconhecido no Prisma Client: ${nome}`);
  return m;
}
