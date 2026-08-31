/**
 * Login e sessão do Cliente — a identidade única do assinante.
 *
 * Não é mais uma solução isolada como as outras seis: é a conta "guarda-
 * chuva" que decide quais delas assinar. As tabelas de cada solução
 * continuam isoladas — o Cliente nunca lê `Organizacao`, `LicitacaoConta`
 * etc. diretamente. O que ele faz é criar/gerenciar essas contas por baixo
 * (ver `src/app/cliente/painel/acoes.ts`) e, ao "acessar" uma delas, emitir
 * a sessão daquela solução via `src/lib/cliente/sso.ts` — sem pedir senha
 * de novo.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verify as verificarCodigoOtp } from "otplib";
import { prisma } from "@/lib/prisma";

const MAX_TENTATIVAS = 5;
const JANELA_MINUTOS = 15;

const HASH_FALSO = "$2a$10$K8pQm3nBvCxZaWeRtYuIoOePlKjHgFdSaZxCvBnMqWeRtYuIoPlKj";

async function bloqueado(email: string): Promise<number> {
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60 * 1000);
  const tentativas = await prisma.clienteTentativaLogin.count({ where: { email, criadoEm: { gte: desde } } });
  if (tentativas < MAX_TENTATIVAS) return 0;
  return JANELA_MINUTOS;
}

export const authOptionsCliente: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/cliente/entrar" },
  cookies: {
    sessionToken: {
      name: "cliente.session-token",
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

        const cliente = await prisma.cliente.findUnique({ where: { email } });

        const hash = cliente?.passwordHash ?? HASH_FALSO;
        const senhaConfere = await bcrypt.compare(credentials.senha, hash);

        if (!cliente || !cliente.ativo || !senhaConfere) {
          await prisma.clienteTentativaLogin.create({ data: { email } });
          return null;
        }

        if (cliente.totpAtivado && cliente.totpSegredo) {
          const codigo = (credentials.codigo ?? "").trim().replace(/\s/g, "");

          if (!codigo) {
            throw new Error("CODIGO_NECESSARIO");
          }

          const conferencia = await verificarCodigoOtp({ secret: cliente.totpSegredo, token: codigo });
          if (!conferencia.valid) {
            await prisma.clienteTentativaLogin.create({ data: { email } });
            throw new Error("Código de verificação inválido.");
          }
        }

        await prisma.clienteTentativaLogin.deleteMany({ where: { email } });
        await prisma.cliente.update({ where: { id: cliente.id }, data: { ultimoAcesso: new Date() } });

        return {
          id: cliente.id,
          name: cliente.nome,
          email: cliente.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as never as { id: string }).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as never as Record<string, unknown>).id = token.id;
      }
      return session;
    },
  },
};
