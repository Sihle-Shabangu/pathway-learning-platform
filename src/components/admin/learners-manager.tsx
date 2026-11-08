"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MoreHorizontal, Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, PageHeader } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatRelative, formatScore, initials } from "@/lib/format";
import type { LearnerList, LearnerRow } from "@/server/services/learner.service";
import { LearnerFormSheet, type EditableLearner } from "./learner-form-sheet";
import { LearnerStatusDialog, type StatusTarget } from "./learner-status-dialog";

const PAGE_SIZE = 10;
const ALL = "all";

/** Returns `value` only after it has stopped changing for `delay` ms (so we don't query on every keystroke). */
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function RowActions({
  learner,
  onEdit,
  onToggleStatus,
}: {
  learner: LearnerRow;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${learner.name}`}>
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/learners/${learner.id}`}>View details</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onToggleStatus} variant={learner.status === "ACTIVE" ? "destructive" : "default"}>
          {learner.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LearnersManager() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [cohort, setCohort] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

  // Drawer state. `?new=1` (from the dashboard quick action) opens it in "add" mode.
  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "1");
  const [editing, setEditing] = useState<EditableLearner | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (status !== ALL) params.set("status", status);
  if (cohort !== ALL) params.set("cohort", cohort);

  const query = useQuery({
    queryKey: ["learners", params.toString()],
    queryFn: () => apiFetch<LearnerList>(`/api/learners?${params.toString()}`),
    placeholderData: keepPreviousData, // keep the old page visible while the next one loads
  });

  function openAdd() {
    setEditing(null);
    setFormKey((key) => key + 1);
    setFormOpen(true);
  }

  function openEdit(learner: LearnerRow) {
    setEditing({ id: learner.id, name: learner.name, email: learner.email, cohort: learner.cohort });
    setFormKey((key) => key + 1);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open && searchParams.get("new")) router.replace("/admin/learners");
  }

  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const firstShown = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const lastShown = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const hasFilters = Boolean(debouncedSearch) || status !== ALL || cohort !== ALL;

  return (
    <>
      <PageHeader
        title="Learners"
        description="Search, add and manage learner accounts."
        actions={
          <Button onClick={openAdd}>
            <UserPlus className="size-4" aria-hidden="true" />
            Add learner
          </Button>
        }
      />

      <Card className="gap-0 p-0 shadow-card">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="learner-search">Search</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="learner-search"
                type="search"
                placeholder="Name or email"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex">
            <div className="space-y-1.5">
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="status-filter" className="w-full md:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cohort-filter">Cohort</Label>
              <Select
                value={cohort}
                onValueChange={(value) => {
                  setCohort(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="cohort-filter" className="w-full md:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All cohorts</SelectItem>
                  {(data?.cohorts ?? []).map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {query.isPending ? (
          <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading learners">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="p-4">
            <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title={hasFilters ? "No learners match these filters" : "No learners yet"}
              description={hasFilters ? "Try a different search or clear the filters." : "Add your first learner to get started."}
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setStatus(ALL);
                      setCohort(ALL);
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={openAdd}>Add learner</Button>
                )
              }
            />
          </div>
        ) : data ? (
          <div aria-busy={query.isFetching}>
            {/* Table at >= 768px */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Learner</TableHead>
                    <TableHead>Cohort</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Avg score</TableHead>
                    <TableHead>Last active</TableHead>
                    <TableHead className="pr-4 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((learner) => (
                    <TableRow key={learner.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <div
                            aria-hidden="true"
                            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
                          >
                            {initials(learner.name)}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/learners/${learner.id}`}
                              className="font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {learner.name}
                            </Link>
                            <p className="truncate text-sm text-muted-foreground">{learner.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{learner.cohort ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={learner.status} />
                      </TableCell>
                      <TableCell>
                        {learner.completedCount} / {learner.assignedCount}
                      </TableCell>
                      <TableCell>{formatScore(learner.averageScore)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatRelative(learner.lastActiveAt)}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <RowActions
                          learner={learner}
                          onEdit={() => openEdit(learner)}
                          onToggleStatus={() => setStatusTarget(learner)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Cards below 768px */}
            <ul className="divide-y md:hidden">
              {data.items.map((learner) => (
                <li key={learner.id} className="flex items-start gap-3 p-4">
                  <div
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
                  >
                    {initials(learner.name)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link href={`/admin/learners/${learner.id}`} className="font-medium text-foreground hover:underline">
                      {learner.name}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">{learner.email}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <StatusBadge status={learner.status} />
                      <span>{learner.cohort ?? "No cohort"}</span>
                      <span>
                        · {learner.completedCount}/{learner.assignedCount} done
                      </span>
                      <span>· avg {formatScore(learner.averageScore)}</span>
                    </div>
                  </div>
                  <RowActions
                    learner={learner}
                    onEdit={() => openEdit(learner)}
                    onToggleStatus={() => setStatusTarget(learner)}
                  />
                </li>
              ))}
            </ul>

            <nav
              aria-label="Pagination"
              className="flex flex-col items-center justify-between gap-3 border-t p-4 text-sm text-muted-foreground sm:flex-row"
            >
              <p aria-live="polite">
                Showing {firstShown}–{lastShown} of {data.total} learners
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Previous
                </Button>
                <span>
                  Page {data.page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </nav>
          </div>
        ) : null}
      </Card>

      <LearnerFormSheet
        key={formKey}
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        learner={editing}
        cohorts={data?.cohorts ?? []}
      />
      <LearnerStatusDialog target={statusTarget} onClose={() => setStatusTarget(null)} />
    </>
  );
}
