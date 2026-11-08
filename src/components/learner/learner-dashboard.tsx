"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CalendarClock, Clock, Cpu, PlayCircle, RotateCcw, Trophy } from "lucide-react";
import Link from "next/link";
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatDate, formatScore, pluralize } from "@/lib/format";
import type { LearnerHome, MyAssignment } from "@/server/services/learner-portal.service";
import { ProgressRing } from "./progress-ring";

/** The single primary action for an assignment card. */
function primaryAction(assignment: MyAssignment): { label: string; href: string; icon: typeof PlayCircle } {
  if (assignment.status === "COMPLETED" && assignment.latestCompletedAttemptId) {
    return { label: "Review", href: `/learner/results/${assignment.latestCompletedAttemptId}`, icon: Trophy };
  }
  if (assignment.activeAttempt) {
    return { label: "Resume", href: `/learner/simulation/${assignment.id}`, icon: RotateCcw };
  }
  return { label: "Start", href: `/learner/simulation/${assignment.id}`, icon: PlayCircle };
}

function AssignmentCard({ assignment }: { assignment: MyAssignment }) {
  const action = primaryAction(assignment);
  const ActionIcon = action.icon;
  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
          <Cpu className="size-6 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="font-semibold text-foreground">{assignment.activityTitle}</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={assignment.status} />
            {assignment.isOverdue ? <StatusBadge status="OVERDUE" /> : null}
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-4" aria-hidden="true" />
              {assignment.dueDate ? `Due ${formatDate(assignment.dueDate)}` : "No due date"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-4" aria-hidden="true" />
              ~{assignment.estimatedMinutes} min
            </span>
            {assignment.bestScore !== null ? <span>Score {formatScore(assignment.bestScore)}/100</span> : null}
          </div>
        </div>
        <Button asChild variant={action.label === "Review" ? "outline" : "default"} className="sm:w-32">
          <Link href={action.href} aria-label={`${action.label}: ${assignment.activityTitle}`}>
            <ActionIcon className="size-4" aria-hidden="true" />
            {action.label}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function LearnerDashboard() {
  const query = useQuery({
    queryKey: ["learner-home"],
    queryFn: () => apiFetch<LearnerHome>("/api/assignments/mine"),
  });

  if (query.isPending) return <PageSkeleton cards={2} />;
  if (query.isError) {
    return (
      <>
        <PageHeader title="Home" />
        <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
      </>
    );
  }

  const { firstName, assignments, continueAssignment, progress } = query.data;

  return (
    <>
      <PageHeader title={`Hi, ${firstName}`} description="Here's what's on your bench." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {continueAssignment && continueAssignment.activeAttempt ? (
          <Card className="border-primary/30 bg-primary-soft shadow-card lg:col-span-2">
            <CardContent className="flex h-full flex-col justify-between gap-4">
              <div>
                <p className="mb-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary-hover">
                  <PlayCircle className="size-4" aria-hidden="true" />
                  Continue where you left off
                </p>
                <h2 className="text-xl font-semibold text-foreground">{continueAssignment.activityTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pluralize(continueAssignment.activeAttempt.step, "action")} taken · current score{" "}
                  {continueAssignment.activeAttempt.score}/100. Your progress is saved.
                </p>
              </div>
              <Button asChild size="lg" className="self-start">
                <Link href={`/learner/simulation/${continueAssignment.id}`}>
                  Resume simulation
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card lg:col-span-2">
            <CardContent className="flex h-full flex-col justify-center gap-1">
              <h2 className="text-xl font-semibold text-foreground">Nothing in progress</h2>
              <p className="text-sm text-muted-foreground">
                {assignments.some((a) => a.status === "NOT_STARTED")
                  ? "Start one of your assigned activities below."
                  : "You're all caught up. New activities will appear here when they're assigned."}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card">
          <CardContent className="flex items-center gap-4">
            <ProgressRing percent={progress.percent} caption={`${progress.completed} of ${pluralize(progress.total, "activity", "activities")} completed`} />
            <div>
              <h2 className="font-semibold text-foreground">Overall progress</h2>
              <p className="text-sm text-muted-foreground">
                {progress.total === 0 ? "No activities yet" : `${progress.completed} of ${pluralize(progress.total, "activity", "activities")} completed`}
              </p>
              <Link href="/learner/progress" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                See my progress
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="assigned-heading" className="mt-8">
        <h2 id="assigned-heading" className="mb-3 text-lg font-semibold text-foreground">
          Assigned activities
        </h2>
        {assignments.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No activities assigned yet"
            description="When your educator assigns a simulation, it will appear here."
          />
        ) : (
          <ul className="space-y-3">
            {assignments.map((assignment) => (
              <li key={assignment.id}>
                <AssignmentCard assignment={assignment} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
