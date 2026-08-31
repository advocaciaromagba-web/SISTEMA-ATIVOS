import NextAuth from "next-auth";
import { authOptionsCliente } from "@/lib/cliente/auth";

const handler = NextAuth(authOptionsCliente);

export { handler as GET, handler as POST };
