/**
 * Login e sessão.
 *
 * Duas travas que não são opcionais num sistema que guarda operação de terceiro:
 * limite de tentativas de senha e verificação em duas etapas por aplicativo
 * autenticador. A segunda é opcional por usuário, mas o dono da organização
 * pode exigi-la de todos.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verify as verificarCodigoOtp } from "otplib";
import { prisma } from "@/lib/prisma";
import { registrar } from "@/lib/registro";

const MAX_TENTATIVAS = 5;
const JANELA_MINUTOS = 15;

/** Hash de comparação para e-mail inexistente: mantém o tempo de resposta igual. */
const HASH_FALSO = "$2a$10$K8pQm3nBvCxZaWeRtYuIoOePlKjHgFdSaZxCvBnMqWeRtYuIoPlKj";

async function bloqueado(email: string): Promise<number> {
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60 * 1000);
  const tentativas = await prisma.tentativaLogin.count({ where: { email, criadoEm: { gte: desde } } });
  if (tentativas < MAX_TENTATIVAS) return 0;
  return JANELA_MINUTOS;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 horas
  pages: { signIn: "/login" },
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

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          include: { organizacao: true },
        });

        const hash = usuario?.passwordHash ?? HASH_FALSO;
        const senhaConfere = await bcrypt.compare(credentials.senha, hash);

        if (!usuario || !usuario.ativo || !senhaConfere) {
          await prisma.tentativaLogin.create({ data: { email } });
          await registrar({ acao: "LOGIN_FALHA", entidade: "Usuario", detalhe: { email } });
          return null;
        }

        if (!usuario.organizacao.ativa) {
          throw new Error("Esta conta está suspensa. Fale com o suporte.");
        }

        // ---- segunda etapa ----
        if (usuario.totpAtivado && usuario.totpSegredo) {
          const codigo = (credentials.codigo ?? "").trim().replace(/\s/g, "");

          if (!codigo) {
            // A tela de login reconhece esta mensagem e passa a pedir o código.
            throw new Error("CODIGO_NECESSARIO");
          }

          const conferencia = await verificarCodigoOtp({ secret: usuario.totpSegredo, token: codigo });
          if (!conferencia.valid) {
            await prisma.tentativaLogin.create({ data: { email } });
            throw new Error("Código de verificação inválido.");
          }
        }

        await prisma.tentativaLogin.deleteMany({ where: { email } });
        await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcesso: new Date() } });
        await registrar({
          acao: "LOGIN",
          organizacaoId: usuario.organizacaoId,
          usuarioId: usuario.id,
          entidade: "Usuario",
          entidadeId: usuario.id,
        });

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          organizacaoId: usuario.organizacaoId,
          papel: usuario.papel,
          admin: usuario.admin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as never as { id: string }).id;
        token.organizacaoId = (user as never as { organizacaoId: string }).organizacaoId;
        token.papel = (user as never as { papel: string }).papel;
        token.admin = (user as never as { admin: boolean }).admin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as never as Record<string, unknown>).id = token.id;
        (session.user as never as Record<string, unknown>).organizacaoId = token.organizacaoId;
        (session.user as never as Record<string, unknown>).papel = token.papel;
        (session.user as never as Record<string, unknown>).admin = token.admin;
      }
      return session;
    },
  },
};
