import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

// Teach TypeScript that our session and JWT carry the user's id and role.
declare module "next-auth" {
  interface User {
    role: Role;
  }
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
  }
}
