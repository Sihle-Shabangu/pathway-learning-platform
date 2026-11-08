import { AppShell } from "@/components/layout/app-shell";
import { requirePageRole } from "@/server/auth/guards";

// Server-side role check for every /admin page (the proxy is only the first line of defence).
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requirePageRole("ADMIN");
  return <AppShell user={{ name: user.name, role: user.role }}>{children}</AppShell>;
}
