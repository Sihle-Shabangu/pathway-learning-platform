import { CheckCircle2, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Logo } from "@/components/layout/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const HIGHLIGHTS = [
  {
    title: "Hands-on troubleshooting:",
    text: "practise diagnosing real hardware faults in a safe, guided simulation.",
  },
  {
    title: "Instant feedback:",
    text: "every decision is scored and explained, so you learn the expert path.",
  },
  {
    title: "Progress you can see:",
    text: "learners and educators track scores and completions over time.",
  },
];

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center p-4 sm:p-6">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-xl bg-surface shadow-card lg:grid-cols-12">
        {/* Brand panel: desktop only */}
        <section
          aria-label="About Pathway"
          className="relative hidden flex-col justify-between overflow-hidden bg-primary-soft p-10 lg:col-span-6 lg:flex xl:col-span-7"
        >
          <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-primary/10 blur-3xl" />
          <Logo subtitle="Learning & simulation platform" className="relative" />

          <div className="relative my-10">
            <h1 className="max-w-xl text-4xl leading-tight font-semibold tracking-tight text-foreground">
              Build real-world skills through guided simulations.
            </h1>
            <ul className="mt-8 max-w-lg space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item.title} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <strong className="font-medium text-foreground">{item.title}</strong> {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-sm text-muted-foreground">Nudle (Pty) Ltd · Pathway</p>
        </section>

        {/* Sign-in panel */}
        <section className="flex flex-col justify-center p-6 sm:p-10 lg:col-span-6 xl:col-span-5">
          <div className="mx-auto w-full max-w-md">
            <Logo className="mb-8 justify-center lg:hidden" />
            <div className="mb-6">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back</h2>
              <p className="mt-1 text-muted-foreground">Sign in with your Pathway account to continue.</p>
            </div>

            <LoginForm />

            <div className="mt-6 flex items-center gap-2 rounded-lg bg-primary-soft p-3 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <p>No role selector needed: you&apos;ll go straight to the right dashboard for your account.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
