"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Activity as ActivityIcon,
  UserPlus,
  Users,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ChartDataTable, CompletionRateBarChart, CompletionsAreaChart } from "@/components/charts";
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { describeAuditAction } from "@/lib/audit-text";
import { formatPercent, formatRelative, formatShortDueDate, initials, pluralize } from "@/lib/format";
import type { DashboardData } from "@/server/services/stats.service";

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  progress,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  progress?: number | null;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft">
            <Icon className="size-5 text-primary" aria-hidden="true" />
          </div>
        </div>
        <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
        {progress !== undefined && progress !== null ? (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-progress" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminDashboard({ adminName }: { adminName: string }) {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/api/stats"),
    refetchInterval: 10_000, // spec: live dashboard, refresh every 10 seconds
  });

  const header = (
    <PageHeader
      title={`Welcome back, ${adminName.split(" ")[0]}`}
      description="Learner progress and simulation activity at a glance."
      actions={
        <>
          <Button asChild variant="secondary">
            <Link href="/admin/activities">
              <ClipboardList className="size-4" aria-hidden="true" />
              Assign activity
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/learners?new=1">
              <UserPlus className="size-4" aria-hidden="true" />
              Add learner
            </Link>
          </Button>
        </>
      }
    />
  );

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

  const data = query.data;
  const { kpis } = data;
  const inactive = kpis.totalLearners - kpis.activeLearners;
  const totalCompletions30 = data.completionsLast30Days.reduce((sum, day) => sum + day.completions, 0);

  return (
    <>
      {header}

      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total learners"
          value={String(kpis.totalLearners)}
          hint={`Including ${pluralize(inactive, "inactive learner")}`}
          icon={Users}
        />
        <KpiCard
          label="Active learners"
          value={String(kpis.activeLearners)}
          hint="Learners with an active account"
          icon={UserCheck}
        />
        <KpiCard
          label="Assigned activities"
          value={String(kpis.assignedActivities)}
          hint="Assignments held by active learners"
          icon={BookOpen}
        />
        <KpiCard
          label="Completion rate"
          value={formatPercent(kpis.completionRate)}
          hint={
            kpis.assignedActivities === 0
              ? "No assignments yet"
              : `${kpis.completedAssignments} of ${kpis.assignedActivities} completed`
          }
          icon={CheckCircle2}
          progress={kpis.completionRate}
        />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Completions over the last 30 days</CardTitle>
            <CardDescription>{pluralize(totalCompletions30, "assignment")} completed in this period</CardDescription>
          </CardHeader>
          <CardContent>
            {totalCompletions30 === 0 ? (
              <EmptyState
                icon={ActivityIcon}
                title="No completions yet"
                description="Completed simulations will appear here."
                className="border-none"
              />
            ) : (
              <>
                <CompletionsAreaChart data={data.completionsLast30Days} />
                <ChartDataTable
                  caption="Completions per day, last 30 days"
                  headers={["Date", "Completions"]}
                  rows={data.completionsLast30Days
                    .filter((day) => day.completions > 0)
                    .map((day) => [day.date, String(day.completions)])}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Completion rate by activity</CardTitle>
            <CardDescription>Active learners only</CardDescription>
          </CardHeader>
          <CardContent>
            {data.completionByActivity.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No activities yet"
                description="Create an activity to start tracking completion."
                action={
                  <Button asChild variant="outline">
                    <Link href="/admin/activities">Go to activities</Link>
                  </Button>
                }
                className="border-none"
              />
            ) : (
              <>
                <CompletionRateBarChart data={data.completionByActivity} />
                <ChartDataTable
                  caption="Completion rate by activity"
                  headers={["Activity", "Completion rate"]}
                  rows={data.completionByActivity.map((row) => [
                    row.title,
                    `${formatPercent(row.completionRate)} (${row.completed} of ${row.assigned})`,
                  ])}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="size-5 text-primary" aria-hidden="true" />
              Recent activity
            </CardTitle>
            <CardDescription>Updates every 10 seconds</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <EmptyState title="Nothing has happened yet" className="border-none" />
            ) : (
              <ul className="divide-y">
                {data.recentActivity.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 py-3">
                    <div
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
                    >
                      {initials(item.actorName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{item.actorName}</span>{" "}
                        {describeAuditAction(item.action, item.metadata)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatRelative(item.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link href="/admin/audit">View full audit log</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-warning" aria-hidden="true" />
              Needs attention
            </CardTitle>
            <CardDescription>
              {data.needsAttention.length === 0
                ? "No overdue assignments"
                : `${pluralize(data.needsAttention.length, "overdue assignment")}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.needsAttention.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All caught up"
                description="No active learner has an overdue assignment."
                className="border-none"
              />
            ) : (
              <ul className="space-y-3">
                {data.needsAttention.map((item) => (
                  <li
                    key={item.assignmentId}
                    className="flex items-center gap-3 rounded-lg border bg-red-50/40 p-3"
                  >
                    <Clock className="size-5 shrink-0 text-destructive" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.learnerName}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {item.activityTitle} · due {formatShortDueDate(item.dueDate)}
                      </p>
                      <StatusBadge
                        status="OVERDUE"
                        label={`${pluralize(item.daysOverdue, "day")} overdue`}
                        className="mt-1"
                      />
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/learners/${item.learnerId}`} aria-label={`View ${item.learnerName}`}>
                        View
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
