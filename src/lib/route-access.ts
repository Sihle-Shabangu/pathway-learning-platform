export type SessionRole = "ADMIN" | "LEARNER" | null;

/**
 * Decides where a request should go based on the path and the signed-in role.
 * Returns the path to redirect to, or null to let the request through.
 * Pure function so the rules are easy to read and unit test.
 */
export function redirectFor(pathname: string, role: SessionRole): string | null {
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLearnerArea = pathname === "/learner" || pathname.startsWith("/learner/");
  const isLoginPage = pathname === "/login";
  const isRoot = pathname === "/";

  const home = role === "ADMIN" ? "/admin" : role === "LEARNER" ? "/learner" : "/login";

  if (!role) {
    return isAdminArea || isLearnerArea || isRoot ? "/login" : null;
  }
  if (isLoginPage || isRoot) return home;
  if (isAdminArea && role !== "ADMIN") return home;
  if (isLearnerArea && role !== "LEARNER") return home;
  return null;
}
