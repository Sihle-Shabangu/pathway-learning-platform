import { redirect } from "next/navigation";
import { getCurrentUser, homePathForRole } from "@/server/auth/guards";

// The proxy normally handles "/", this is a server-side fallback.
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? homePathForRole(user.role) : "/login");
}
