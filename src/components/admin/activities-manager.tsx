"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, Cpu, Plus, Send } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatPercent, formatScore } from "@/lib/format";
import type { ActivityCard } from "@/server/services/activity.service";
import { AssignActivityDialog } from "./assign-activity-dialog";
import { CreateActivityDialog } from "./create-activity-dialog";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function ActivitiesManager() {
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ id: string; title: string } | null>(null);

  const query = useQuery({
    queryKey: ["activities"],
    queryFn: () => apiFetch<ActivityCard[]>("/api/activities"),
  });

  return (
    <>
      <PageHeader
        title="Activities"
        description="Simulation activities, how learners are doing, and who they're assigned to."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Create activity
          </Button>
        }
      />

      {query.isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading activities">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No activities yet"
          description="Create your first simulation activity, then assign it to learners."
          action={<Button onClick={() => setCreateOpen(true)}>Create activity</Button>}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.data.map((activity) => (
            <li key={activity.id}>
              <Card className="h-full shadow-card">
                <CardHeader>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-primary-hover">
                      <Cpu className="size-3.5" aria-hidden="true" />
                      Simulation
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3.5" aria-hidden="true" />
                      {activity.estimatedMinutes} min
                    </span>
                  </div>
                  <CardTitle className="text-lg">{activity.title}</CardTitle>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{activity.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <Stat label="Assigned" value={String(activity.assigned)} />
                    <Stat label="Completed" value={String(activity.completed)} />
                    <Stat label="Avg score" value={formatScore(activity.averageScore)} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-semibold text-foreground">{formatPercent(activity.completionRate)}</span>
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label={`${activity.title} completion`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={activity.completionRate ?? 0}
                    >
                      <div className="h-full rounded-full bg-progress" style={{ width: `${activity.completionRate ?? 0}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activity.inProgress} in progress · active learners only
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto">
                  <Button className="w-full" onClick={() => setAssignTarget({ id: activity.id, title: activity.title })}>
                    <Send className="size-4" aria-hidden="true" />
                    Assign
                  </Button>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <CreateActivityDialog open={createOpen} onOpenChange={setCreateOpen} />
      {/* key resets the dialog's selections each time it opens for an activity */}
      <AssignActivityDialog key={assignTarget?.id ?? "closed"} activity={assignTarget} onClose={() => setAssignTarget(null)} />
    </>
  );
}
