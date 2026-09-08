/**
 * Acesso administrativo à conta de um cliente ("entrar como").
 *
 * É o poder mais perigoso desta área: o administrador passa a ver a tela do
 * cliente com os dados reais dele. Por isso três coisas andam juntas e nunca
 * separadas:
 *
 * 1. fica registrado quando começa e quando termina (`AdminAcesso`);
 * 2. um cookie marca a sessão como administrativa enquanto ela durar;
 * 3. uma tarja vermelha aparece em TODA página do site enquanto estiver ativa,
 *    para nunca ser possível esquecer que se está dentro da conta de outro.
 *
 * O cookie não concede nada — quem concede é o cookie de sessão da própria
 * solução, emitido pela mesma ponte que o hub do cliente já usa. Este aqui
 * serve só para marcar e para saber o que encerrar.
 */
import { cookies, type UnsafeUnwrappedCookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const COOKIE_ACESSO_ADMIN = "admin.acesso";

/** Cookie de sessão de cada solução, para saber o que apagar ao encerrar. */
const COOKIE_DA_SOLUCAO: Record<string, string> = {
  GESTAO_ATIVOS:
    process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
  LICITACOES: "licitacoes.session-token",
  COMPLIANCE_EMPRESA: "compliance.session-token",
  CONSULTA_CADASTRAL_SERASA: "serasa.session-token",
  DILIGENCIA_PESSOA: "diligencia.session-token",
  VERIFICACAO_DOCUMENTOS: "verificacao.session-token",
  AGROJUD: "agro.session-token",
};

export type AcessoEmCurso = {
  id: string;
  solucao: string;
  contaNome: string;
  administradorNome: string;
  iniciadoEm: Date;
};

/**
 * Lê, para qualquer página do site, se a sessão atual é um acesso
 * administrativo em curso. Devolve `null` no caso normal (cliente de verdade).
 */
export async function acessoAdminEmCurso(): Promise<AcessoEmCurso | null> {
  const id = (await cookies()).get(COOKIE_ACESSO_ADMIN)?.value;
  if (!id) return null;

  const acesso = await prisma.adminAcesso.findUnique({
    where: { id },
    include: { administrador: { select: { nome: true } } },
  });

  // Encerrado (ou apagado): o cookie perdeu a validade sozinho.
  if (!acesso || acesso.encerradoEm) return null;

  return {
    id: acesso.id,
    solucao: acesso.solucao,
    contaNome: acesso.contaNome,
    administradorNome: acesso.administrador.nome,
    iniciadoEm: acesso.iniciadoEm,
  };
}

export function marcarCookieAcesso(acessoId: string, duracaoSegundos: number): void {
  (cookies() as unknown as UnsafeUnwrappedCookies).set(COOKIE_ACESSO_ADMIN, acessoId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: duracaoSegundos,
  });
}

/** Apaga o cookie da solução e o marcador — o admin volta a ser só o admin. */
export function limparCookiesDeAcesso(solucao: string): void {
  const c = (cookies() as unknown as UnsafeUnwrappedCookies);
  const cookieSolucao = COOKIE_DA_SOLUCAO[solucao];
  if (cookieSolucao) c.delete(cookieSolucao);
  c.delete(COOKIE_ACESSO_ADMIN);
}
