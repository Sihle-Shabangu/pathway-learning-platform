"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, History, Search } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { AUDIT_ACTION_LABELS, describeAuditAction } from "@/lib/audit-text";
import { formatDateTime, initials } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { AuditPage } from "@/server/services/audit.service";

const PAGE_SIZE = 20;
const ALL = "all";

const actionLabel = (action: string) => AUDIT_ACTION_LABELS[action] ?? action;

export function AuditLog() {
  const [action, setAction] = useState(ALL);
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const debouncedActor = useDebouncedValue(actor.trim());

  // Validate the date range in the browser too, so we never send a request we know is invalid.
  const rangeError = from && to && from > to ? "The start date must be on or before the end date." : null;

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (action !== ALL) params.set("action", action);
  if (debouncedActor) params.set("actor", debouncedActor);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const query = useQuery({
    queryKey: ["audit", params.toString()],
    queryFn: () => apiFetch<AuditPage>(`/api/audit?${params.toString()}`),
    placeholderData: keepPreviousData,
    enabled: !rangeError,
  });

  const hasFilters = action !== ALL || Boolean(debouncedActor) || Boolean(from) || Boolean(to);
  function clearFilters() {
    setAction(ALL);
    setActor("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader title="Audit log" description="Every change made in Pathway: who did it, what they did, and when." />

      <Card className="gap-0 p-0 shadow-card">
        <div className="grid grid-cols-1 gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_auto_auto_auto] lg:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="audit-actor">Who</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="audit-actor"
                type="search"
                placeholder="Name or email"
                className="pl-9"
                value={actor}
                onChange={(e) => {
                  setActor(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-action">Action</Label>
            <Select
              value={action}
              onValueChange={(value) => {
                setAction(value);
                setPage(1);
              }}
            >
              <SelectTrigger id="audit-action" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All actions</SelectItem>
                {(data?.actions ?? []).map((name) => (
                  <SelectItem key={name} value={name}>
                    {actionLabel(name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-from">From</Label>
            <Input
              id="audit-from"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              aria-invalid={Boolean(rangeError)}
              aria-describedby={rangeError ? "audit-range-error" : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-to">To</Label>
            <Input
              id="audit-to"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              aria-invalid={Boolean(rangeError)}
            />
          </div>
          <Button variant="outline" onClick={clearFilters} disabled={!hasFilters}>
            Clear filters
          </Button>
          {rangeError ? (
            <p id="audit-range-error" role="alert" className="text-sm text-destructive sm:col-span-2 lg:col-span-5">
              {rangeError}
            </p>
          ) : null}
        </div>

        {rangeError ? null : query.isPending ? (
          <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading audit log">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="p-4">
            <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={History}
              title={hasFilters ? "No entries match these filters" : "No activity recorded yet"}
              description={hasFilters ? "Try a wider date range or clear the filters." : undefined}
              action={hasFilters ? <Button variant="outline" onClick={clearFilters}>Clear filters</Button> : undefined}
            />
          </div>
        ) : data ? (
          <div aria-busy={query.isFetching}>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">When</TableHead>
                    <TableHead>Who</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="pr-4">Record</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="pl-4 whitespace-nowrap text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            aria-hidden="true"
                            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
                          >
                            {initials(row.actorName)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{row.actorName}</p>
                            <p className="text-xs text-muted-foreground">{row.actorRole === "ADMIN" ? "Admin" : "Learner"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{actionLabel(row.action)}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        {row.actorName} {describeAuditAction(row.action, row.metadata)}
                      </TableCell>
                      <TableCell className="pr-4 font-mono text-xs text-muted-foreground">{row.entityType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y md:hidden">
              {data.items.map((row) => (
                <li key={row.id} className="space-y-1 p-4">
                  <p className="text-sm font-medium text-foreground">{actionLabel(row.action)}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.actorName} {describeAuditAction(row.action, row.metadata)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</p>
                </li>
              ))}
            </ul>
            <nav
              aria-label="Pagination"
              className="flex flex-col items-center justify-between gap-3 border-t p-4 text-sm text-muted-foreground sm:flex-row"
            >
              <p aria-live="polite">
                {data.total} {data.total === 1 ? "entry" : "entries"} · page {data.page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </nav>
          </div>
        ) : null}
      </Card>
    </>
  );
}
