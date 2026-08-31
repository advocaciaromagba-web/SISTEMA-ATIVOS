import NextAuth from "next-auth";
import { authOptionsDiligencia } from "@/lib/diligencia/auth";

const handler = NextAuth(authOptionsDiligencia);

export { handler as GET, handler as POST };
