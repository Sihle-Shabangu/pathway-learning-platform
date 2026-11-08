import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { forbidden, unauthenticated } from "@/server/errors";
import { findActiveUserById, type AuthenticatedUser } from "@/server/services/auth.service";
import { auth } from "./index";

export type CurrentUser = AuthenticatedUser;

/** The dashboard each role lands on after login. */
export function homePathForRole(role: Role): string {
  return role === "ADMIN" ? "/admin" : "/learner";
}

/**
 * Reads the JWT, then re-checks the user in the database so a deactivated
 * account loses access immediately (the JWT alone would stay valid for 12 hours).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return findActiveUserById(userId);
}

/** For pages: redirects to /login or to the user's own dashboard when the role is wrong. */
export async function requirePageRole(role: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(homePathForRole(user.role));
  return user;
}

/** For API route handlers: throws 401/403 AppErrors that toErrorResponse() maps to JSON. */
export async function requireApiRole(role: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  if (user.role !== role) throw forbidden();
  return user;
}

/** For API route handlers that any signed-in user may call. */
export async function requireApiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}
