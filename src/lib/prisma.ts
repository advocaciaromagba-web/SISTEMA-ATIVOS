import { PrismaClient } from "@prisma/client";

// Em desenvolvimento o Next recarrega o codigo a cada alteracao. Sem guardar a
// conexao numa variavel global, cada recarga abriria um novo pool e o banco
// acabaria recusando conexoes.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
