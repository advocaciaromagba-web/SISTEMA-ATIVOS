import NextAuth from "next-auth";
import { authOptionsCompliance } from "@/lib/compliance/auth";

const handler = NextAuth(authOptionsCompliance);

export { handler as GET, handler as POST };
