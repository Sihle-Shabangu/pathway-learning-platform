"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch, errorMessage, postJson } from "@/lib/api-client";
import { pluralize } from "@/lib/format";
import type { LearnerList } from "@/server/services/learner.service";
import type { AssignResult } from "@/server/services/assignment.service";

const NO_COHORT = "none";

/** Assign one activity to selected learners and/or a whole cohort, with an optional due date. */
export function AssignActivityDialog({
  activity,
  onClose,
}: {
  activity: { id: string; title: string } | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cohort, setCohort] = useState(NO_COHORT);
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Active learners only: inactive learners can't be assigned work.
  const learners = useQuery({
    queryKey: ["learners", "assignable"],
    queryFn: () => apiFetch<LearnerList>("/api/learners?status=ACTIVE&pageSize=100"),
    enabled: activity !== null,
  });

  const mutation = useMutation({
    mutationFn: (payload: unknown) => postJson<AssignResult>("/api/assignments", payload),
    onSuccess: (result) => {
      const skipped = result.skipped > 0 ? ` ${pluralize(result.skipped, "learner")} already had it.` : "";
      toast.success(`Assigned to ${pluralize(result.added, "learner")}.${skipped}`);
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["learners"] });
      queryClient.invalidateQueries({ queryKey: ["learner"] });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError && err.fields ? Object.values(err.fields)[0] : errorMessage(err));
    },
  });

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const all = learners.data?.items ?? [];
  const visible = all.filter((learner) => {
    const term = filter.trim().toLowerCase();
    return !term || learner.name.toLowerCase().includes(term) || learner.email.toLowerCase().includes(term);
  });
  const cohortCount = cohort === NO_COHORT ? 0 : all.filter((learner) => learner.cohort === cohort).length;
  // Learners reached = individually selected ∪ everyone in the chosen cohort.
  const reach = new Set([...selected, ...all.filter((l) => cohort !== NO_COHORT && l.cohort === cohort).map((l) => l.id)]).size;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activity) return;
    if (reach === 0) {
      setError("Choose at least one learner or a cohort.");
      return;
    }
    setError(null);
    mutation.mutate({
      activityId: activity.id,
      learnerIds: [...selected],
      cohort: cohort === NO_COHORT ? undefined : cohort,
      dueDate: dueDate || undefined,
    });
  }

  const pending = mutation.isPending;

  return (
    <Dialog open={activity !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Assign activity</DialogTitle>
          <DialogDescription>
            Assign <strong className="text-foreground">{activity?.title}</strong> to learners or a whole cohort. Learners who
            already have it are skipped.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-busy={pending}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="assign-cohort">Whole cohort (optional)</Label>
              <Select value={cohort} onValueChange={setCohort} disabled={pending}>
                <SelectTrigger id="assign-cohort" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COHORT}>No cohort</SelectItem>
                  {(learners.data?.cohorts ?? []).map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cohort !== NO_COHORT ? (
                <p className="text-sm text-muted-foreground">{pluralize(cohortCount, "active learner")} in {cohort}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-due">Due date (optional)</Label>
              <Input
                id="assign-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Individual learners</legend>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                aria-label="Filter learners"
                placeholder="Filter by name or email"
                className="pl-9"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              {learners.isPending ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : learners.isError ? (
                <ErrorState message={errorMessage(learners.error)} onRetry={() => learners.refetch()} className="border-none" />
              ) : visible.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No active learners match.</p>
              ) : (
                <ul className="divide-y">
                  {visible.map((learner) => {
                    const id = `assign-${learner.id}`;
                    const inCohort = cohort !== NO_COHORT && learner.cohort === cohort;
                    return (
                      <li key={learner.id} className="flex items-center gap-3 px-3 py-2">
                        <Checkbox
                          id={id}
                          checked={selected.has(learner.id) || inCohort}
                          disabled={inCohort || pending}
                          onCheckedChange={() => toggle(learner.id)}
                        />
                        <Label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0 font-normal">
                          <span className="font-medium text-foreground">{learner.name}</span>
                          <span className="truncate text-sm text-muted-foreground">
                            {learner.email} · {learner.cohort ?? "No cohort"}
                            {inCohort ? " · included via cohort" : ""}
                          </span>
                        </Label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </fieldset>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || reach === 0}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {pending ? "Assigning…" : `Assign to ${pluralize(reach, "learner")}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
