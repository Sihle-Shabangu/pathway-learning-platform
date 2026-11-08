"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Loader2,
  Lock,
  LogOut,
  Search,
  ShieldCheck,
  Stethoscope,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorMessage, postJson } from "@/lib/api-client";
import type { ActionGroup, AvailableAction, Decision } from "@/lib/simulation/types";
import { cn } from "@/lib/utils";
import type { ApplyActionResponse, SimulationView } from "@/server/services/simulation.service";
import { COMPONENT_LABELS, PcTower } from "./pc-tower";

const GROUPS: { id: ActionGroup; title: string; icon: LucideIcon; hint: string }[] = [
  { id: "safety", title: "Safety", icon: ShieldCheck, hint: "Do these before touching anything inside the case." },
  { id: "investigate", title: "Investigate", icon: Search, hint: "Gather evidence. Repeating a check costs points." },
  { id: "repair", title: "Repair", icon: Wrench, hint: "Fix or replace parts. Unjustified swaps cost points." },
  { id: "diagnose", title: "Diagnose", icon: Stethoscope, hint: "Name the fault when you're confident." },
];

type Tab = "symptoms" | "actions" | "findings";

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "±0";
}

function Panel({ title, icon: Icon, children, className }: { title: string; icon: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn("rounded-xl border border-sim-border bg-sim-panel p-4", className)}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-sim-text uppercase">
        <Icon className="size-4 text-sim-primary" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function FindingsLog({ decisions }: { decisions: Decision[] }) {
  if (decisions.length === 0) {
    return <p className="text-sm text-sim-muted">No actions yet. Your findings and their score impact will appear here.</p>;
  }
  // Newest first so the latest result is always visible.
  return (
    <ol className="space-y-2" aria-label="Findings, newest first">
      {[...decisions].reverse().map((decision) => (
        <li
          key={decision.step}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-3",
            decision.correct ? "border-sim-border bg-sim-raised/60" : "border-sim-danger/40 bg-sim-danger/10",
          )}
        >
          {decision.correct ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-sim-success" aria-label="Good decision" />
          ) : (
            <XCircle className="mt-0.5 size-5 shrink-0 text-sim-danger" aria-label="Costly decision" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-sim-text">
              <span className="font-mono text-sim-muted">#{decision.step}</span> {decision.actionLabel}
            </p>
            <p className="mt-0.5 text-sm text-sim-muted">{decision.feedback}</p>
          </div>
          <span
            className={cn(
              "shrink-0 font-mono text-sm font-semibold",
              decision.scoreDelta < 0 ? "text-sim-danger" : "text-sim-success",
            )}
          >
            {formatDelta(decision.scoreDelta)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ActionButton({
  action,
  done,
  highlighted,
  pending,
  disabled,
  onRun,
}: {
  action: AvailableAction;
  done: boolean;
  highlighted: boolean;
  pending: boolean;
  disabled: boolean;
  onRun: () => void;
}) {
  const hintId = `hint-${action.id}`;
  if (action.locked) {
    return (
      <div
        className="flex items-start gap-2 rounded-lg border border-dashed border-sim-border p-3 opacity-90"
        aria-describedby={hintId}
      >
        <Lock className="mt-0.5 size-4 shrink-0 text-sim-muted" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-sim-muted">
            {action.label} <span className="sr-only">(locked)</span>
          </p>
          {action.lockHint ? (
            <p id={hintId} className="mt-0.5 text-xs text-sim-muted">
              {action.lockHint}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onRun}
      disabled={disabled}
      aria-busy={pending}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors",
        "text-sim-text focus-visible:ring-2 focus-visible:ring-sim-primary focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        highlighted ? "border-sim-primary bg-sim-primary/15" : "border-sim-border bg-sim-raised hover:border-sim-primary/70",
      )}
    >
      <span className="flex-1">{action.label}</span>
      {pending ? <Loader2 className="size-4 animate-spin text-sim-primary" aria-hidden="true" /> : null}
      {done && !pending ? (
        <span className="inline-flex items-center gap-1 text-xs text-sim-success">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Done
        </span>
      ) : null}
    </button>
  );
}

export function Workbench({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["simulation", assignmentId];
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("actions");
  const [lastFeedback, setLastFeedback] = useState<{ text: string; delta: number; correct: boolean } | null>(null);

  // Starting is idempotent on the server: it resumes the in-progress attempt if there is one.
  const query = useQuery({
    queryKey,
    queryFn: () => postJson<SimulationView>("/api/simulation/start", { assignmentId }),
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: ({ view, actionId }: { view: SimulationView; actionId: string }) =>
      postJson<ApplyActionResponse>(`/api/simulation/attempts/${view.attemptId}/actions`, {
        actionId,
        expectedStep: view.step,
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(queryKey, response.view);
      setLastFeedback({ text: response.feedback, delta: response.scoreDelta, correct: response.correct });
      if (response.view.status === "COMPLETED") {
        toast.success("Fault fixed! Loading your results…");
        queryClient.invalidateQueries({ queryKey: ["learner-home"] });
        router.push(`/learner/results/${response.view.attemptId}`);
      }
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        // Another tab (or a double click) already saved this step: show the latest server state.
        toast.info(error.message);
        query.refetch();
        return;
      }
      toast.error(errorMessage(error), { description: "Your progress is saved. You can try that action again." });
    },
  });

  if (query.isPending) {
    return (
      <div className="space-y-4 rounded-2xl bg-sim-bg p-4" aria-busy="true" aria-label="Loading simulation">
        <Skeleton className="h-20 w-full bg-sim-panel" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 bg-sim-panel" />
          <Skeleton className="h-80 bg-sim-panel" />
          <Skeleton className="h-80 bg-sim-panel" />
        </div>
      </div>
    );
  }

  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl bg-sim-bg p-10 text-center text-sim-text">
        <AlertTriangle className="size-8 text-sim-warning" aria-hidden="true" />
        <p className="font-semibold">{missing ? "This activity isn't assigned to you." : "We couldn't load the simulation."}</p>
        <p className="text-sm text-sim-muted">{missing ? "Check your dashboard for your assigned activities." : errorMessage(query.error)}</p>
        <div className="flex gap-2">
          {!missing ? (
            <Button onClick={() => query.refetch()} className="bg-sim-primary text-sim-bg hover:bg-sim-primary/90">
              Try again
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/learner">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const view = query.data;

  if (view.status === "COMPLETED") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-sim-bg p-10 text-center text-sim-text">
        <CheckCircle2 className="size-10 text-sim-success" aria-hidden="true" />
        <p className="text-lg font-semibold">You&apos;ve completed this simulation.</p>
        <p className="text-sm text-sim-muted">Final score: {view.score}/100</p>
        <Button asChild className="bg-sim-primary text-sim-bg hover:bg-sim-primary/90">
          <Link href={`/learner/results/${view.attemptId}`}>Review your results</Link>
        </Button>
      </div>
    );
  }

  const doneIds = new Set(view.decisions.map((decision) => decision.actionId));
  const actionCounts: Record<string, number> = {};
  for (const action of view.actions) {
    if (action.component) actionCounts[action.component] = (actionCounts[action.component] ?? 0) + 1;
  }
  const busy = mutation.isPending;
  const pendingActionId = busy ? mutation.variables?.actionId : undefined;

  function run(actionId: string) {
    if (busy) return; // one action at a time; the server also rejects duplicates with 409
    mutation.mutate({ view, actionId });
  }

  function selectPart(id: string) {
    setSelectedPart((current) => (current === id ? null : id));
    setTab("actions");
  }

  const symptomsPanel = (
    <Panel title="Symptoms" icon={AlertTriangle}>
      <p className="mb-3 text-sm text-sim-muted">{view.briefing}</p>
      <ul className="space-y-2">
        {view.symptoms.map((symptom) => (
          <li key={symptom} className="flex items-start gap-2 rounded-lg bg-sim-raised p-3 text-sm text-sim-text">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-sim-warning" aria-hidden="true" />
            {symptom}
          </li>
        ))}
      </ul>
    </Panel>
  );

  const actionsPanel = (
    <Panel title="Actions" icon={Wrench}>
      {selectedPart ? (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-sim-primary/15 px-3 py-2 text-sm text-sim-text">
          <span>
            Highlighting actions for <strong>{COMPONENT_LABELS[selectedPart]}</strong>
          </span>
          <button
            type="button"
            className="rounded text-sim-primary underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-sim-primary focus-visible:outline-none"
            onClick={() => setSelectedPart(null)}
          >
            Clear
          </button>
        </div>
      ) : null}
      <div className="space-y-5">
        {GROUPS.map((group) => {
          const actions = view.actions.filter((action) => action.group === group.id);
          if (actions.length === 0) return null;
          const GroupIcon = group.icon;
          return (
            <div key={group.id} role="group" aria-labelledby={`group-${group.id}`}>
              <h3 id={`group-${group.id}`} className="flex items-center gap-2 text-xs font-semibold tracking-wider text-sim-muted uppercase">
                <GroupIcon className="size-3.5" aria-hidden="true" />
                {group.title}
              </h3>
              <p className="mb-2 text-xs text-sim-muted">{group.hint}</p>
              <ul className="space-y-2">
                {actions.map((action) => (
                  <li key={action.id}>
                    <ActionButton
                      action={action}
                      done={doneIds.has(action.id)}
                      highlighted={selectedPart !== null && action.component === selectedPart}
                      pending={pendingActionId === action.id}
                      disabled={busy}
                      onRun={() => run(action.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );

  const findingsPanel = (
    <Panel title="Findings log" icon={ClipboardList}>
      <FindingsLog decisions={view.decisions} />
    </Panel>
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "symptoms", label: "Symptoms" },
    { id: "actions", label: "Actions" },
    { id: "findings", label: `Findings (${view.decisions.length})` },
  ];

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] bg-sim-bg p-4 text-sim-text sm:-mx-6 sm:p-6 lg:-mx-8 lg:-my-8 lg:min-h-screen lg:p-8">
      {/* Top bar */}
      <header className="mb-4 flex flex-col gap-3 rounded-xl border border-sim-border bg-sim-panel p-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sim-primary/20">
            <Cpu className="size-5 text-sim-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-sim-text">{view.activityTitle}</h1>
            <p className="text-sm text-sim-muted">Find the hidden fault and fix it safely.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-sim-raised px-3 py-1.5 font-mono text-sm text-sim-text">
            Step <span className="font-semibold">{view.step + 1}</span>
          </span>
          <span className="rounded-lg bg-sim-raised px-3 py-1.5 font-mono text-sm text-sim-text" aria-live="polite">
            Score <span className="font-semibold text-sim-teal">{view.score}</span>
            <span className="text-sim-muted"> / 100</span>
          </span>
          <Button asChild variant="outline" className="border-sim-border bg-transparent text-sim-text hover:bg-sim-raised hover:text-sim-text">
            <Link href="/learner">
              <LogOut className="size-4" aria-hidden="true" />
              Exit and save
            </Link>
          </Button>
        </div>
      </header>

      {/* Latest result, announced to screen readers */}
      <div aria-live="polite" role="status" className="mb-4">
        {lastFeedback ? (
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              lastFeedback.correct ? "border-sim-success/40 bg-sim-success/10" : "border-sim-danger/40 bg-sim-danger/10",
            )}
          >
            {lastFeedback.correct ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-sim-success" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0 text-sim-danger" aria-hidden="true" />
            )}
            <p className="flex-1 text-sm text-sim-text">
              <span className="sr-only">{lastFeedback.correct ? "Good decision. " : "Costly decision. "}</span>
              {lastFeedback.text}
            </p>
            <span className={cn("font-mono text-sm font-semibold", lastFeedback.delta < 0 ? "text-sim-danger" : "text-sim-success")}>
              {formatDelta(lastFeedback.delta)} pts
            </span>
          </div>
        ) : null}
      </div>

      {/* Illustration */}
      <section aria-label="Workbench" className="mb-4 flex flex-col items-center rounded-xl border border-sim-border bg-sim-panel p-4 lg:hidden">
        <PcTower selected={selectedPart} onSelect={selectPart} actionCounts={actionCounts} />
      </section>

      {/* Mobile and tablet: tabs */}
      <div className="lg:hidden">
        <div role="tablist" aria-label="Simulation panels" className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-sim-panel p-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`tabpanel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-lg px-2 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-sim-primary focus-visible:outline-none",
                tab === item.id ? "bg-sim-primary text-sim-bg" : "text-sim-muted hover:text-sim-text",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "symptoms" ? symptomsPanel : tab === "actions" ? actionsPanel : findingsPanel}
        </div>
      </div>

      {/* Desktop: three columns plus the log */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">{symptomsPanel}</div>
        <section aria-label="Workbench" className="flex flex-col items-center rounded-xl border border-sim-border bg-sim-panel p-4">
          <p className="mb-2 self-start text-sm text-sim-muted">Select a part to highlight related actions.</p>
          <PcTower selected={selectedPart} onSelect={selectPart} actionCounts={actionCounts} />
        </section>
        <div>{actionsPanel}</div>
        <div className="lg:col-span-3">{findingsPanel}</div>
      </div>
    </div>
  );
}
