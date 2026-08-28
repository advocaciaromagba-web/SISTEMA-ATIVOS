import NextAuth from "next-auth";
import { authOptionsSerasa } from "@/lib/serasa/auth";

const handler = NextAuth(authOptionsSerasa);

export { handler as GET, handler as POST };
