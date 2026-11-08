"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/server/auth/actions";
import { Logo } from "./logo";
import { ADMIN_NAV, LEARNER_NAV, isNavItemActive, type NavItem } from "./nav-items";

type ShellUser = { name: string; role: "ADMIN" | "LEARNER" };

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Page chrome for both roles:
 * - >= 1024px: fixed left sidebar with nav and the signed-in user.
 * - <  1024px: compact top header and a bottom navigation bar.
 */
export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const pathname = usePathname();
  const nav: NavItem[] = user.role === "ADMIN" ? ADMIN_NAV : LEARNER_NAV;
  const roleLabel = user.role === "ADMIN" ? "Administrator" : "Learner";

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-surface lg:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Link href={nav[0].href} aria-label="Pathway home">
            <Logo />
          </Link>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = isNavItemActive(item, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-primary-soft hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 border-t p-4">
          <div
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
          >
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-surface px-4 lg:hidden">
        <Link href={nav[0].href} aria-label="Pathway home">
          <Logo className="[&>div:first-child]:size-8" />
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Sign out"
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-5" aria-hidden="true" />
          </button>
        </form>
      </header>

      <main id="main-content" className="pb-24 lg:pb-0 lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {nav.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
