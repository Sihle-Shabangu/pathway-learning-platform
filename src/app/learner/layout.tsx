import { AppShell } from "@/components/layout/app-shell";
import { requirePageRole } from "@/server/auth/guards";

// Server-side role check for every /learner page (the proxy is only the first line of defence).
export default async function LearnerLayout({ children }: LayoutProps<"/learner">) {
  const user = await requirePageRole("LEARNER");
  return <AppShell user={{ name: user.name, role: user.role }}>{children}</AppShell>;
}
