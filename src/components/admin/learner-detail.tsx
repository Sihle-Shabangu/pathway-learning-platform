"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, CheckCircle2, ChevronDown, Download, Mail, Pencil, PlayCircle, Target, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AttemptDecisions } from "@/components/attempt-decisions";
import { ChartDataTable, ScoreLineChart } from "@/components/charts";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, apiFetch, errorMessage } from "@/lib/api-client";
import { formatDate, formatDateTime, formatDueDate, formatPercent, formatRelative, formatScore, initials } from "@/lib/format";
import { faultLabel } from "@/lib/simulation/scenarios/catalog";
import { cn } from "@/lib/utils";
import type { LearnerAssignment, LearnerDetail as LearnerDetailData } from "@/server/services/learner.service";
import { LearnerFormSheet } from "./learner-form-sheet";
import { LearnerStatusDialog, type StatusTarget } from "./learner-status-dialog";

function isOverdue(assignment: LearnerAssignment): boolean {
  return assignment.status !== "COMPLETED" && assignment.dueDate !== null && new Date(assignment.dueDate) < new Date();
}

function AssignmentRow({ assignment }: { assignment: LearnerAssignment }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = `attempts-${assignment.id}`;
  const hasAttempts = assignment.attempts.length > 0;

  return (
    <li className="rounded-xl border bg-surface">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{assignment.activityTitle}</p>
          <p className="text-sm text-muted-foreground">
            Assigned {formatDate(assignment.assignedAt)} · Due {formatDueDate(assignment.dueDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={assignment.status} />
          {isOverdue(assignment) ? <StatusBadge status="OVERDUE" /> : null}
          <span className="text-sm text-muted-foreground">
            Best score: <span className="font-semibold text-foreground">{formatScore(assignment.bestScore)}</span>
          </span>
        </div>
        {hasAttempts ? (
          <Button
            variant="outline"
            size="sm"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Hide" : "Show"} {assignment.attempts.length === 1 ? "attempt" : `${assignment.attempts.length} attempts`}
            <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">No attempts yet</span>
        )}
      </div>

      {hasAttempts && expanded ? (
        <div id={panelId} className="space-y-4 border-t bg-background/60 p-4">
          {assignment.attempts.map((attempt, index) => (
            <div key={attempt.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">Attempt {assignment.attempts.length - index}</p>
                <StatusBadge status={attempt.status} />
                <span className="rounded-full bg-primary-soft px-2 py-0.5 font-mono text-xs font-semibold text-primary-hover">
                  {attempt.status === "COMPLETED" ? "Final" : "Current"} score {attempt.score}/100
                </span>
                <span className="text-sm text-muted-foreground">
                  {attempt.completedAt ? `Finished ${formatDateTime(attempt.completedAt)}` : `Started ${formatDateTime(attempt.startedAt)}`}
                </span>
              </div>
              {attempt.faultId ? (
                <p className="text-sm text-muted-foreground">
                  Hidden fault: <span className="font-medium text-foreground">{faultLabel(attempt.faultId)}</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">The hidden fault is revealed once the attempt is finished.</p>
              )}
              <AttemptDecisions decisions={attempt.decisions} />
            </div>
          ))}
        </div>
      ) : null}
    </li>
  );
}

export function LearnerDetail({ learnerId }: { learnerId: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);

  const query = useQuery({
    queryKey: ["learner", learnerId],
    queryFn: () => apiFetch<LearnerDetailData>(`/api/learners/${learnerId}`),
  });

  const backLink = (
    <Link href="/admin/learners" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden="true" />
      All learners
    </Link>
  );

  if (query.isPending) {
    return (
      <>
        {backLink}
        <PageSkeleton cards={3} />
      </>
    );
  }

  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <>
        {backLink}
        {missing ? (
          <EmptyState icon={Users} title="Learner not found" description="They may have been removed, or the link is wrong." />
        ) : (
          <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
        )}
      </>
    );
  }

  const { profile, summary, scoreHistory, assignments } = query.data;
  const chartData = scoreHistory.map((entry) => ({ label: entry.activityTitle, score: entry.score, date: entry.completedAt }));

  return (
    <>
      {backLink}

      <Card className="mb-6 shadow-card">
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center">
          <div
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl font-semibold text-primary"
          >
            {initials(profile.name)}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{profile.name}</h1>
              <StatusBadge status={profile.status} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="size-4" aria-hidden="true" />
                {profile.email}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-4" aria-hidden="true" />
                Cohort {profile.cohort ?? "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-4" aria-hidden="true" />
                Joined {formatDate(profile.createdAt)}
              </span>
              <span>Last active {formatRelative(profile.lastActiveAt)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={`/api/reports/learners/${profile.id}`} download>
                <Download className="size-4" aria-hidden="true" />
                Export report (CSV)
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditKey((key) => key + 1);
                setEditOpen(true);
              }}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Button>
            <Button
              variant={profile.status === "ACTIVE" ? "destructive" : "default"}
              onClick={() => setStatusTarget({ id: profile.id, name: profile.name, status: profile.status })}
            >
              {profile.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
              Completed
            </p>
            <p className="text-3xl font-semibold text-foreground">
              {summary.completed} / {summary.assigned}
            </p>
            <p className="text-sm text-muted-foreground">{formatPercent(summary.completionRate)} completion rate</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="size-4 text-primary" aria-hidden="true" />
              Average score
            </p>
            <p className="text-3xl font-semibold text-foreground">{formatScore(summary.averageScore)}</p>
            <p className="text-sm text-muted-foreground">Across {scoreHistory.length} completed attempts</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PlayCircle className="size-4 text-primary" aria-hidden="true" />
              In progress
            </p>
            <p className="text-3xl font-semibold text-foreground">{summary.inProgress}</p>
            <p className="text-sm text-muted-foreground">Activities started but not finished</p>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-6 shadow-card">
        <CardHeader>
          <CardTitle>Score over time</CardTitle>
          <CardDescription>Final score of each completed attempt</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <EmptyState title="No completed attempts yet" description="Scores appear here once an attempt is finished." className="border-none" />
          ) : (
            <>
              <ScoreLineChart data={chartData} />
              <ChartDataTable
                caption="Score per completed attempt"
                headers={["Completed", "Score"]}
                rows={scoreHistory.map((entry) => [formatDateTime(entry.completedAt), `${entry.score}/100`])}
              />
            </>
          )}
        </CardContent>
      </Card>

      <section className="mt-6" aria-labelledby="assignments-heading">
        <h2 id="assignments-heading" className="mb-3 text-lg font-semibold text-foreground">
          Assignments
        </h2>
        {assignments.length === 0 ? (
          <EmptyState
            title="No assignments"
            description="Assign an activity from the Activities page."
            action={
              <Button asChild variant="outline">
                <Link href="/admin/activities">Go to activities</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {assignments.map((assignment) => (
              <AssignmentRow key={assignment.id} assignment={assignment} />
            ))}
          </ul>
        )}
      </section>

      <LearnerFormSheet
        key={editKey}
        open={editOpen}
        onOpenChange={setEditOpen}
        learner={{ id: profile.id, name: profile.name, email: profile.email, cohort: profile.cohort }}
        cohorts={profile.cohort ? [profile.cohort] : []}
      />
      <LearnerStatusDialog target={statusTarget} onClose={() => setStatusTarget(null)} />
    </>
  );
}
