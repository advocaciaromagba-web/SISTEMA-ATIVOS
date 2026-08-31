/**
 * Ponte de sessão: emite a sessão de uma solução para o Cliente que já
 * está autenticado no hub, sem pedir a senha de novo.
 *
 * Cada solução guarda a sessão num cookie JWT próprio, assinado com o
 * mesmo `NEXTAUTH_SECRET` — nenhuma delas define `jwt.encode`/`decode`
 * customizado, então usam o padrão do NextAuth, o mesmo `encode()`
 * importado aqui. O que muda de uma para outra é só o nome do cookie e
 * quais campos o `token` carrega — por isso o mapa `CONFIGS` abaixo.
 *
 * Isto não fura o isolamento entre soluções: continua sendo uma sessão
 * de cada solução, lida pelo `exigirSessaoX()` de cada uma, contra a
 * tabela própria dela. O que este arquivo faz é só o que o formulário de
 * login faria — só que a senha já foi conferida uma vez, no cadastro ou
 * na assinatura, e reaproveitada por baixo (ver `painel/acoes.ts`).
 */
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";

const OITO_HORAS = 8 * 60 * 60;

type CamposUsuario = { id: string; nome: string; email: string } & Record<string, unknown>;

type ConfigSolucao = {
  cookieName: string;
  campos: (usuario: CamposUsuario) => Record<string, unknown>;
};

function nomeCookiePadraoNextAuth(): string {
  // A Gestão de Ativos não define nome de cookie próprio — usa o padrão do
  // NextAuth, que muda conforme HTTPS ou não.
  return process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token";
}

const CONFIGS: Record<string, ConfigSolucao> = {
  GESTAO_ATIVOS: {
    cookieName: nomeCookiePadraoNextAuth(),
    campos: (u) => ({ organizacaoId: u.organizacaoId, papel: u.papel, admin: u.admin ?? false }),
  },
  LICITACOES: {
    cookieName: "licitacoes.session-token",
    campos: (u) => ({ licitacaoContaId: u.licitacaoContaId, papel: u.papel }),
  },
  COMPLIANCE_EMPRESA: {
    cookieName: "compliance.session-token",
    campos: (u) => ({ complianceContaId: u.complianceContaId, papel: u.papel }),
  },
  CONSULTA_CADASTRAL_SERASA: {
    cookieName: "serasa.session-token",
    campos: (u) => ({ serasaContaId: u.serasaContaId, papel: u.papel }),
  },
  DILIGENCIA_PESSOA: {
    cookieName: "diligencia.session-token",
    campos: (u) => ({ diligenciaContaId: u.diligenciaContaId, papel: u.papel }),
  },
  VERIFICACAO_DOCUMENTOS: {
    cookieName: "verificacao.session-token",
    campos: (u) => ({ verificacaoContaId: u.verificacaoContaId, papel: u.papel }),
  },
};

export function solucaoTemSso(solucao: string): boolean {
  return solucao in CONFIGS;
}

/**
 * Grava o cookie de sessão daquela solução no navegador de quem está
 * chamando — precisa ser chamado de dentro de uma Server Action ou Route
 * Handler (onde `cookies().set` é permitido).
 */
export async function emitirSessaoSolucao(solucao: string, usuario: CamposUsuario): Promise<void> {
  const config = CONFIGS[solucao];
  if (!config) throw new Error(`Solução sem ponte de sessão: ${solucao}`);

  const agora = Math.floor(Date.now() / 1000);
  const token = {
    name: usuario.nome,
    email: usuario.email,
    sub: usuario.id,
    id: usuario.id,
    ...config.campos(usuario),
    iat: agora,
    exp: agora + OITO_HORAS,
    jti: crypto.randomUUID(),
  };

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET não configurado.");

  const codificado = await encode({ token, secret, maxAge: OITO_HORAS });

  cookies().set(config.cookieName, codificado, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: OITO_HORAS,
  });
}
