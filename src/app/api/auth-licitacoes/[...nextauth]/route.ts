import NextAuth from "next-auth";
import { authOptionsLicitacoes } from "@/lib/licitacoes/auth";

const handler = NextAuth(authOptionsLicitacoes);

export { handler as GET, handler as POST };
