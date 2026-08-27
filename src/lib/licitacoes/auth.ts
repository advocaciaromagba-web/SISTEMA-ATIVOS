/**
 * Login e sessão da solução de Licitações.
 *
 * Espelha `src/lib/auth.ts` (Gestão de Ativos) em toda a lógica — mesma trava
 * de tentativas, mesma verificação em duas etapas por aplicativo autenticador
 * — mas contra `LicitacaoUsuario`/`LicitacaoConta`, não `Usuario`/`Organizacao`.
 * É a mesma regra que separou as tabelas de dados aplicada ao login: logar
 * aqui não abre a Gestão de Ativos, e vice-versa.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verify as verificarCodigoOtp } from "otplib";
import { prisma } from "@/lib/prisma";

const MAX_TENTATIVAS = 5;
const JANELA_MINUTOS = 15;

/** Hash de comparação para e-mail inexistente: mantém o tempo de resposta igual. */
const HASH_FALSO = "$2a$10$K8pQm3nBvCxZaWeRtYuIoOePlKjHgFdSaZxCvBnMqWeRtYuIoPlKj";

async function bloqueado(email: string): Promise<number> {
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60 * 1000);
  const tentativas = await prisma.licitacaoTentativaLogin.count({ where: { email, criadoEm: { gte: desde } } });
  if (tentativas < MAX_TENTATIVAS) return 0;
  return JANELA_MINUTOS;
}

export const authOptionsLicitacoes: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/licitacoes/entrar" },
  // Nome de cookie próprio: sem isso, o NextAuth usaria o mesmo nome do
  // login da Gestão de Ativos, e logar numa solução derrubaria a sessão da
  // outra no mesmo navegador.
  cookies: {
    sessionToken: {
      name: "licitacoes.session-token",
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

        const usuario = await prisma.licitacaoUsuario.findUnique({
          where: { email },
          include: { licitacaoConta: true },
        });

        const hash = usuario?.passwordHash ?? HASH_FALSO;
        const senhaConfere = await bcrypt.compare(credentials.senha, hash);

        if (!usuario || !usuario.ativo || !senhaConfere) {
          await prisma.licitacaoTentativaLogin.create({ data: { email } });
          return null;
        }

        if (!usuario.licitacaoConta.ativa) {
          throw new Error("Esta conta está suspensa. Fale com o suporte.");
        }

        if (usuario.totpAtivado && usuario.totpSegredo) {
          const codigo = (credentials.codigo ?? "").trim().replace(/\s/g, "");

          if (!codigo) {
            throw new Error("CODIGO_NECESSARIO");
          }

          const conferencia = await verificarCodigoOtp({ secret: usuario.totpSegredo, token: codigo });
          if (!conferencia.valid) {
            await prisma.licitacaoTentativaLogin.create({ data: { email } });
            throw new Error("Código de verificação inválido.");
          }
        }

        await prisma.licitacaoTentativaLogin.deleteMany({ where: { email } });
        await prisma.licitacaoUsuario.update({ where: { id: usuario.id }, data: { ultimoAcesso: new Date() } });

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          licitacaoContaId: usuario.licitacaoContaId,
          papel: usuario.papel,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as never as { id: string }).id;
        token.licitacaoContaId = (user as never as { licitacaoContaId: string }).licitacaoContaId;
        token.papel = (user as never as { papel: string }).papel;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as never as Record<string, unknown>).id = token.id;
        (session.user as never as Record<string, unknown>).licitacaoContaId = token.licitacaoContaId;
        (session.user as never as Record<string, unknown>).papel = token.papel;
      }
      return session;
    },
  },
};
