import { BarChart3, BookOpen, History, LayoutDashboard, Users, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only highlight on an exact match (used for dashboard roots like /admin). */
  exact?: boolean;
};

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/learners", label: "Learners", icon: Users },
  { href: "/admin/activities", label: "Activities", icon: BookOpen },
  { href: "/admin/audit", label: "Audit log", icon: History },
];

export const LEARNER_NAV: NavItem[] = [
  { href: "/learner", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/learner/progress", label: "My progress", icon: BarChart3 },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
