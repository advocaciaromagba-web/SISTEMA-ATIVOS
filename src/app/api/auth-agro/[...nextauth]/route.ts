import NextAuth from "next-auth";
import { authOptionsAgro } from "@/lib/agro/auth";

const handler = NextAuth(authOptionsAgro);

export { handler as GET, handler as POST };
