/**
 * Login da administração da Blackbird.
 *
 * Espelha o padrão das soluções (`src/lib/agro/auth.ts`) — mesma trava de
 * tentativas, mesma verificação em duas etapas — mas contra `Administrador`,
 * que é conta de dentro de casa e não tem nada a ver com cliente nem com
 * conta de solução.
 *
 * Duas diferenças de propósito, porque esta conta enxerga tudo:
 * - a sessão dura menos (2 horas, não 8);
 * - login e falha de login são gravados na auditoria, sempre.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verify as verificarCodigoOtp } from "otplib";
import { prisma } from "@/lib/prisma";

const MAX_TENTATIVAS = 5;
const JANELA_MINUTOS = 15;

/** Duas horas: acesso irrestrito não deve ficar aberto o dia inteiro. */
export const DURACAO_SESSAO_ADMIN = 2 * 60 * 60;

/**
 * Hash descartável usado quando o e-mail não existe. Serve para o `compare`
 * rodar do mesmo jeito e o tempo de resposta não denunciar quais e-mails
 * existem — a mesma técnica usada nas outras soluções.
 */
const HASH_FALSO = "$2a$10$K8pQm3nBvCxZaWeRtYuIoOePlKjHgFdSaZxCvBnMqWeRtYuIoPlKj";

async function bloqueado(email: string): Promise<number> {
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60 * 1000);
  const tentativas = await prisma.adminTentativaLogin.count({ where: { email, criadoEm: { gte: desde } } });
  if (tentativas < MAX_TENTATIVAS) return 0;
  return JANELA_MINUTOS;
}

/** Grava direto, sem passar pelo helper de auditoria, para não criar ciclo de import. */
async function registrar(params: {
  administradorId: string | null;
  nome: string;
  email: string;
  acao: string;
  resumo: string;
}) {
  await prisma.adminAuditoria.create({
    data: {
      administradorId: params.administradorId,
      administradorNome: params.nome,
      administradorEmail: params.email,
      acao: params.acao,
      resumo: params.resumo,
    },
  });
}

export const authOptionsAdmin: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: DURACAO_SESSAO_ADMIN },
  pages: { signIn: "/admin/entrar" },
  cookies: {
    sessionToken: {
      name: "admin.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
        codigo: { label: "Código de verificação", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) return null;

        const email = credentials.email.toLowerCase().trim();

        const minutos = await bloqueado(email);
        if (minutos > 0) {
          throw new Error(`Muitas tentativas erradas. Tente novamente em ${minutos} minutos.`);
        }

        const admin = await prisma.administrador.findUnique({ where: { email } });

        const hash = admin?.passwordHash ?? HASH_FALSO;
        const senhaConfere = await bcrypt.compare(credentials.senha, hash);

        if (!admin || !admin.ativo || !senhaConfere) {
          await prisma.adminTentativaLogin.create({ data: { email } });
          await registrar({
            administradorId: admin?.id ?? null,
            nome: admin?.nome ?? "(desconhecido)",
            email,
            acao: "LOGIN_FALHA",
            resumo: `Tentativa de login recusada para ${email}.`,
          });
          return null;
        }

        if (admin.totpAtivado && admin.totpSegredo) {
          const codigo = (credentials.codigo ?? "").trim().replace(/\s/g, "");
          if (!codigo) throw new Error("CODIGO_NECESSARIO");

          const conferencia = await verificarCodigoOtp({ secret: admin.totpSegredo, token: codigo });
          if (!conferencia.valid) {
            await prisma.adminTentativaLogin.create({ data: { email } });
            await registrar({
              administradorId: admin.id,
              nome: admin.nome,
              email,
              acao: "LOGIN_FALHA",
              resumo: "Código de verificação em duas etapas inválido.",
            });
            throw new Error("Código de verificação inválido.");
          }
        }

        await prisma.adminTentativaLogin.deleteMany({ where: { email } });
        await prisma.administrador.update({ where: { id: admin.id }, data: { ultimoAcesso: new Date() } });
        await registrar({
          administradorId: admin.id,
          nome: admin.nome,
          email: admin.email,
          acao: "LOGIN",
          resumo: `${admin.nome} entrou na administração.`,
        });

        return { id: admin.id, name: admin.nome, email: admin.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = (user as never as { id: string }).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as never as Record<string, unknown>).id = token.id;
      return session;
    },
  },
};
