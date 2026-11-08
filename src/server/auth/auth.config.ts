import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

/**
 * Shared Auth.js settings with no database or bcrypt imports, so src/proxy.ts can use
 * it to read the session cheaply. The Credentials provider is added in ./index.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 }, // 12 hours
  providers: [],
  callbacks: {
    // Runs when the JWT is created (user is set on sign-in) and on every read.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    // Copies id and role from the JWT into the session the app reads.
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
} satisfies NextAuthConfig;
