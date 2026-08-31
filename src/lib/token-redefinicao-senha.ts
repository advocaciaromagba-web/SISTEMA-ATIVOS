import crypto from "crypto";

/**
 * Mecânica do token de redefinição de senha, igual em todas as soluções: o
 * token que vai no link do e-mail nunca é o mesmo que fica salvo no banco —
 * salva-se o hash, para que um vazamento do banco não valha como senha de
 * ninguém.
 */

export const VALIDADE_MINUTOS = 60;

export function gerarTokenRedefinicao(): { token: string; hash: string; expiraEm: Date } {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const expiraEm = new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000);
  return { token, hash, expiraEm };
}

export function hashDoToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
