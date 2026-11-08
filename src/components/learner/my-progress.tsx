"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, History, Target, Trophy, ListChecks } from "lucide-react";
import Link from "next/link";
import { ChartDataTable, ScoreLineChart } from "@/components/charts";
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatDate, formatDateTime, formatPercent, formatScore } from "@/lib/format";
import type { LearnerProgress } from "@/server/services/learner-portal.service";

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: typeof Target }) {
  return (
    <Card className="shadow-card">
      <CardContent className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4 text-primary" aria-hidden="true" />
          {label}
        </p>
        <p className="text-3xl font-semibold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function HistoryAction({ row }: { row: LearnerProgress["history"][number] }) {
  return row.status === "COMPLETED" ? (
    <Button asChild variant="outline" size="sm">
      <Link href={`/learner/results/${row.attemptId}`} aria-label={`Review ${row.activityTitle} attempt`}>
        Review
      </Link>
    </Button>
  ) : (
    <Button asChild size="sm">
      <Link href={`/learner/simulation/${row.assignmentId}`} aria-label={`Resume ${row.activityTitle}`}>
        Resume
      </Link>
    </Button>
  );
}

export function MyProgress() {
  const query = useQuery({
    queryKey: ["my-progress"],
    queryFn: () => apiFetch<LearnerProgress>("/api/stats/me"),
  });

  const header = <PageHeader title="My progress" description="Your simulation scores and history over time." />;

  if (query.isPending) {
    return (
      <>
        {header}
        <PageSkeleton />
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        {header}
        <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
      </>
    );
  }

  const { stats, scoreTrend, history } = query.data;

  return (
    <>
      {header}
      <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Completed"
          value={`${stats.completed} / ${stats.assigned}`}
          hint={`${formatPercent(stats.completionRate)} of your activities`}
          icon={CheckCircle2}
        />
        <StatCard label="Average score" value={formatScore(stats.averageScore)} hint="Across completed attempts" icon={Target} />
        <StatCard label="Best score" value={formatScore(stats.bestScore)} hint="Your highest single result" icon={Trophy} />
        <StatCard
          label="Decision accuracy"
          value={formatPercent(stats.decisionAccuracy)}
          hint="Share of your decisions that cost no points"
          icon={ListChecks}
        />
      </section>

      <Card className="mt-6 shadow-card">
        <CardHeader>
          <CardTitle>Score trend</CardTitle>
          <CardDescription>Final score of each completed attempt, oldest first</CardDescription>
        </CardHeader>
        <CardContent>
          {scoreTrend.length === 0 ? (
            <EmptyState
              title="No completed attempts yet"
              description="Finish a simulation to start your trend."
              action={
                <Button asChild variant="outline">
                  <Link href="/learner">Go to my activities</Link>
                </Button>
              }
              className="border-none"
            />
          ) : (
            <>
              <ScoreLineChart data={scoreTrend.map((point) => ({ label: point.activityTitle, score: point.score, date: point.completedAt }))} />
              <ChartDataTable
                caption="Score per completed attempt"
                headers={["Completed", "Score"]}
                rows={scoreTrend.map((point) => [formatDateTime(point.completedAt), `${point.score}/100`])}
              />
            </>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="history-heading" className="mt-6">
        <h2 id="history-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
          <History className="size-5 text-primary" aria-hidden="true" />
          Attempt history
        </h2>
        {history.length === 0 ? (
          <EmptyState title="No attempts yet" description="Your attempts will be listed here." />
        ) : (
          <Card className="gap-0 p-0 shadow-card">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Date</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Actions taken</TableHead>
                    <TableHead className="pr-4 text-right">
                      <span className="sr-only">Open</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row) => (
                    <TableRow key={row.attemptId}>
                      <TableCell className="pl-4">{formatDate(row.completedAt ?? row.startedAt)}</TableCell>
                      <TableCell className="font-medium">{row.activityTitle}</TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell>{row.status === "COMPLETED" ? `${row.score}/100` : "—"}</TableCell>
                      <TableCell>{row.actions}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <HistoryAction row={row} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y md:hidden">
              {history.map((row) => (
                <li key={row.attemptId} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-foreground">{row.activityTitle}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <StatusBadge status={row.status} />
                      <span>{formatDate(row.completedAt ?? row.startedAt)}</span>
                      {row.status === "COMPLETED" ? <span>· {row.score}/100</span> : null}
                    </div>
                  </div>
                  <HistoryAction row={row} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </>
  );
}
