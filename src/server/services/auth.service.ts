import bcrypt from "bcryptjs";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { recordAudit } from "@/server/services/audit.service";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/**
 * Checks an email + password pair. Returns the user, or null for any failure
 * (unknown email, wrong password, inactive account) so callers can't tell which.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return null;

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return null;

  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  await recordAudit({
    actorId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
  });

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/** Loads the signed-in user fresh from the database (so deactivation takes effect at once). */
export async function findActiveUserById(id: string): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
