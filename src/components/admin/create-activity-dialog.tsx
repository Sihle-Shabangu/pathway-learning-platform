"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, errorMessage, postJson } from "@/lib/api-client";
import { SCENARIO_OPTIONS } from "@/lib/simulation/scenarios/catalog";
import { createActivitySchema } from "@/lib/validation/activity";

type Fields = { title: string; description: string; scenarioKey: string; estimatedMinutes: string };
type Errors = Partial<Record<keyof Fields | "form", string>>;

const EMPTY: Fields = { title: "", description: "", scenarioKey: SCENARIO_OPTIONS[0].key, estimatedMinutes: "20" };

export function CreateActivityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});

  const mutation = useMutation({
    mutationFn: (payload: unknown) => postJson("/api/activities", payload),
    onSuccess: () => {
      toast.success(`"${fields.title}" has been created.`);
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setFields(EMPTY);
      onOpenChange(false);
    },
    onError: (error) => {
      setErrors(error instanceof ApiError && error.fields ? (error.fields as Errors) : { form: errorMessage(error) });
    },
  });

  function update(key: keyof Fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = createActivitySchema.safeParse(fields);
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.error.issues) {
        const key = (issue.path[0] ?? "form") as keyof Errors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    mutation.mutate(result.data);
  }

  const pending = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create activity</DialogTitle>
          <DialogDescription>Build a new activity from one of the available simulation scenarios.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-busy={pending}>
          {errors.form ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-[#991b1b]">
              {errors.form}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="activity-title">Title</Label>
            <Input
              id="activity-title"
              value={fields.title}
              onChange={(e) => update("title", e.target.value)}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "activity-title-error" : undefined}
              disabled={pending}
            />
            {errors.title ? <p id="activity-title-error" className="text-sm text-destructive">{errors.title}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="activity-description">Description</Label>
            <Textarea
              id="activity-description"
              rows={3}
              value={fields.description}
              onChange={(e) => update("description", e.target.value)}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "activity-description-error" : undefined}
              disabled={pending}
            />
            {errors.description ? (
              <p id="activity-description-error" className="text-sm text-destructive">{errors.description}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="activity-scenario">Scenario</Label>
              <Select value={fields.scenarioKey} onValueChange={(value) => update("scenarioKey", value)} disabled={pending}>
                <SelectTrigger id="activity-scenario" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCENARIO_OPTIONS.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.scenarioKey ? <p className="text-sm text-destructive">{errors.scenarioKey}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-minutes">Estimated minutes</Label>
              <Input
                id="activity-minutes"
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                value={fields.estimatedMinutes}
                onChange={(e) => update("estimatedMinutes", e.target.value)}
                aria-invalid={Boolean(errors.estimatedMinutes)}
                aria-describedby={errors.estimatedMinutes ? "activity-minutes-error" : undefined}
                disabled={pending}
              />
              {errors.estimatedMinutes ? (
                <p id="activity-minutes-error" className="text-sm text-destructive">{errors.estimatedMinutes}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {pending ? "Creating…" : "Create activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
