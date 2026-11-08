"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, BarChart3, CheckCircle2, Circle, PlayCircle, Sparkles, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch, errorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SimulationView } from "@/server/services/simulation.service";
import { ScoreGauge } from "./score-gauge";

/** Plain-language outcome band for a final score. */
export function outcomeFor(score: number): { title: string; message: string } {
  if (score >= 90) return { title: "Expert work", message: "Safe, efficient and evidence-led. That's how a professional technician works." };
  if (score >= 70) return { title: "Well done", message: "You found and fixed the fault. Compare your steps with the expert path to tighten up." };
  if (score >= 50) return { title: "Fault fixed, with costly mistakes", message: "Review the decisions marked in red: safety and evidence matter as much as the fix." };
  return { title: "Needs more practice", message: "You got there, but many steps cost points. Study the expert path and try a similar scenario." };
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "±0";
}

export function ResultsView({ attemptId }: { attemptId: string }) {
  const query = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => apiFetch<SimulationView>(`/api/simulation/attempts/${attemptId}`),
  });

  const shell = (children: React.ReactNode) => (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] bg-sim-bg p-4 text-sim-text sm:-mx-6 sm:p-6 lg:-mx-8 lg:-my-8 lg:min-h-screen lg:p-8">
      {children}
    </div>
  );

  if (query.isPending) {
    return shell(
      <div className="space-y-4" aria-busy="true" aria-label="Loading results">
        <Skeleton className="h-10 w-72 bg-sim-panel" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 bg-sim-panel" />
          <Skeleton className="h-64 bg-sim-panel" />
        </div>
        <Skeleton className="h-96 bg-sim-panel" />
      </div>,
    );
  }

  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return shell(
      <div role="alert" className="flex flex-col items-center gap-3 p-10 text-center">
        <XCircle className="size-8 text-sim-danger" aria-hidden="true" />
        <p className="font-semibold">{missing ? "Result not found" : "We couldn't load your results"}</p>
        <p className="text-sm text-sim-muted">{missing ? "This attempt doesn't exist or isn't yours." : errorMessage(query.error)}</p>
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
      </div>,
    );
  }

  const view = query.data;

  if (view.status !== "COMPLETED" || !view.result) {
    return shell(
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <PlayCircle className="size-10 text-sim-primary" aria-hidden="true" />
        <p className="text-lg font-semibold">This attempt is still in progress</p>
        <p className="text-sm text-sim-muted">Results, including the hidden fault, are shown once you fix it.</p>
        <Button asChild className="bg-sim-primary text-sim-bg hover:bg-sim-primary/90">
          <Link href={`/learner/simulation/${view.assignmentId}`}>Resume simulation</Link>
        </Button>
      </div>,
    );
  }

  const { result, decisions } = view;
  const outcome = outcomeFor(result.finalScore);
  const good = decisions.filter((d) => d.correct).length;
  const costly = decisions.length - good;
  const takenIds = new Set(decisions.map((d) => d.actionId));

  return shell(
    <>
      <Link href="/learner" className="mb-4 inline-flex items-center gap-1 text-sm text-sim-muted hover:text-sim-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to dashboard
      </Link>
      <header className="mb-6">
        <p className="mb-1 inline-flex items-center gap-1 rounded-full bg-sim-success/15 px-3 py-1 text-sm text-sim-success">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Fault resolved · {formatDateTime(view.completedAt)}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Simulation results</h1>
        <p className="text-sim-muted">{view.activityTitle}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Score" className="flex flex-col items-center gap-6 rounded-xl border border-sim-border bg-sim-panel p-6 sm:flex-row">
          <ScoreGauge score={result.finalScore} label="Final score" />
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold">{outcome.title}</h2>
              <p className="text-sm text-sim-muted">{outcome.message}</p>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-sim-raised p-2">
                <dt className="text-xs text-sim-muted">Actions</dt>
                <dd className="font-mono text-lg font-semibold">{decisions.length}</dd>
              </div>
              <div className="rounded-lg bg-sim-raised p-2">
                <dt className="text-xs text-sim-muted">Good</dt>
                <dd className="font-mono text-lg font-semibold text-sim-success">{good}</dd>
              </div>
              <div className="rounded-lg bg-sim-raised p-2">
                <dt className="text-xs text-sim-muted">Costly</dt>
                <dd className="font-mono text-lg font-semibold text-sim-danger">{costly}</dd>
              </div>
            </dl>
            {result.bonus > 0 ? (
              <p className="inline-flex items-center gap-1 text-sm text-sim-warning">
                <Sparkles className="size-4" aria-hidden="true" />
                Efficiency bonus +{result.bonus} (solved in 6 actions or fewer)
              </p>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="fault-heading" className="rounded-xl border border-sim-border bg-sim-panel p-6">
          <h2 id="fault-heading" className="mb-1 text-sm font-semibold tracking-wide text-sim-muted uppercase">
            The hidden fault
          </h2>
          <p className="mb-2 text-xl font-semibold">{result.faultName}</p>
          <p className="text-sm text-sim-muted">{result.explanation}</p>
          <h3 className="mt-4 mb-2 text-sm font-semibold">Symptoms you saw</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-sim-muted">
            {view.symptoms.map((symptom) => (
              <li key={symptom}>{symptom}</li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="decisions-heading" className="mt-6 rounded-xl border border-sim-border bg-sim-panel p-6">
        <h2 id="decisions-heading" className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <BarChart3 className="size-5 text-sim-primary" aria-hidden="true" />
          Decision by decision
        </h2>
        <ol className="space-y-3">
          {decisions.map((decision) => (
            <li
              key={decision.step}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4",
                decision.correct ? "border-sim-border bg-sim-raised/60" : "border-sim-danger/40 bg-sim-danger/10",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold",
                  decision.correct ? "bg-sim-success/20 text-sim-success" : "bg-sim-danger/20 text-sim-danger",
                )}
                aria-hidden="true"
              >
                {String(decision.step).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <span className="sr-only">Step {decision.step}: </span>
                  {decision.actionLabel}
                  <span className="sr-only">{decision.correct ? " (good decision)" : " (costly decision)"}</span>
                </p>
                <p className="mt-1 text-sm text-sim-muted">{decision.feedback}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 font-mono text-sm font-semibold",
                  decision.scoreDelta < 0 ? "bg-sim-danger/15 text-sim-danger" : "bg-sim-success/15 text-sim-success",
                )}
              >
                {formatDelta(decision.scoreDelta)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="expert-heading" className="mt-6 rounded-xl border border-sim-border bg-sim-panel p-6">
        <h2 id="expert-heading" className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Award className="size-5 text-sim-warning" aria-hidden="true" />
          What an expert would have done
        </h2>
        <p className="mb-4 text-sm text-sim-muted">
          The shortest safe, evidence-led path for this fault. Ticks show the steps you also took.
        </p>
        <ol className="space-y-2">
          {result.expertPath.map((step, index) => {
            const taken = takenIds.has(step.id);
            return (
              <li key={step.id} className="flex items-center gap-3 rounded-lg bg-sim-raised p-3">
                <span className="font-mono text-sm text-sim-muted">{index + 1}.</span>
                <span className="flex-1">{step.label}</span>
                {taken ? (
                  <span className="inline-flex items-center gap-1 text-sm text-sim-success">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    You did this
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm text-sim-muted">
                    <Circle className="size-4" aria-hidden="true" />
                    Missed
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button asChild variant="outline" className="border-sim-border bg-transparent text-sim-text hover:bg-sim-raised hover:text-sim-text">
          <Link href="/learner/progress">View my progress</Link>
        </Button>
        <Button asChild className="bg-sim-primary text-sim-bg hover:bg-sim-primary/90">
          <Link href="/learner">Back to dashboard</Link>
        </Button>
      </div>
    </>,
  );
}
