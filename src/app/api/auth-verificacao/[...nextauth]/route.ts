import NextAuth from "next-auth";
import { authOptionsVerificacao } from "@/lib/verificacao/auth";

const handler = NextAuth(authOptionsVerificacao);

export { handler as GET, handler as POST };
