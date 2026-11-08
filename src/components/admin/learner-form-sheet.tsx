"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ApiError, errorMessage, postJson } from "@/lib/api-client";
import { createLearnerSchema, updateLearnerSchema } from "@/lib/validation/learner";

export type EditableLearner = { id: string; name: string; email: string; cohort: string | null };

type Fields = { name: string; email: string; cohort: string; password: string };
type FieldErrors = Partial<Record<keyof Fields | "form", string>>;

function zodErrors(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = (issue.path[0] ?? "form") as keyof FieldErrors;
    errors[key] ??= issue.message;
  }
  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

/**
 * Side drawer for adding (learner = null) or editing a learner.
 * Rendered with a `key` by the parent so each opening starts with fresh field values.
 */
export function LearnerFormSheet({
  open,
  onOpenChange,
  learner,
  cohorts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learner: EditableLearner | null;
  cohorts: string[];
}) {
  const isEdit = learner !== null;
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<Fields>({
    name: learner?.name ?? "",
    email: learner?.email ?? "",
    cohort: learner?.cohort ?? "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: (payload: Record<string, string>) =>
      isEdit ? postJson(`/api/learners/${learner.id}`, payload, "PATCH") : postJson("/api/learners", payload),
    onSuccess: () => {
      toast.success(isEdit ? "Learner updated." : `${fields.name} has been added.`);
      queryClient.invalidateQueries({ queryKey: ["learners"] });
      queryClient.invalidateQueries({ queryKey: ["learner"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fields) {
        setErrors(error.fields as FieldErrors);
      } else {
        setErrors({ form: errorMessage(error) });
      }
    },
  });

  function update(key: keyof Fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = isEdit
      ? { name: fields.name, email: fields.email, cohort: fields.cohort }
      : { ...fields };
    const result = isEdit ? updateLearnerSchema.safeParse(payload) : createLearnerSchema.safeParse(payload);
    if (!result.success) {
      setErrors(zodErrors(result.error.issues));
      return;
    }
    setErrors({});
    mutation.mutate(payload);
  }

  const pending = mutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit learner" : "Add a new learner"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the learner's details. Changes are recorded in the audit log."
              : "Create an account the learner can sign in with straight away."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col gap-5 px-4" aria-busy={pending}>
          {errors.form ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-[#991b1b]">
              {errors.form}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="learner-name">
              Full name <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="learner-name"
              value={fields.name}
              onChange={(e) => update("name", e.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "learner-name-error" : undefined}
              aria-required="true"
              disabled={pending}
              autoComplete="off"
            />
            <FieldError id="learner-name-error" message={errors.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="learner-email">
              Email <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="learner-email"
              type="email"
              value={fields.email}
              onChange={(e) => update("email", e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "learner-email-error" : undefined}
              aria-required="true"
              disabled={pending}
              autoComplete="off"
            />
            <FieldError id="learner-email-error" message={errors.email} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="learner-cohort">
              Cohort <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="learner-cohort"
              list="cohort-options"
              placeholder="e.g. 2025-A"
              value={fields.cohort}
              onChange={(e) => update("cohort", e.target.value)}
              aria-invalid={Boolean(errors.cohort)}
              aria-describedby={errors.cohort ? "learner-cohort-error" : "learner-cohort-hint"}
              aria-required="true"
              disabled={pending}
              autoComplete="off"
            />
            <datalist id="cohort-options">
              {cohorts.map((cohort) => (
                <option key={cohort} value={cohort} />
              ))}
            </datalist>
            {errors.cohort ? (
              <FieldError id="learner-cohort-error" message={errors.cohort} />
            ) : (
              <p id="learner-cohort-hint" className="text-sm text-muted-foreground">
                Pick an existing cohort or type a new one.
              </p>
            )}
          </div>

          {!isEdit ? (
            <div className="space-y-1.5">
              <Label htmlFor="learner-password">
                Temporary password <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="learner-password"
                type="password"
                value={fields.password}
                onChange={(e) => update("password", e.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "learner-password-error" : "learner-password-hint"}
                aria-required="true"
                disabled={pending}
                autoComplete="new-password"
              />
              {errors.password ? (
                <FieldError id="learner-password-error" message={errors.password} />
              ) : (
                <p id="learner-password-hint" className="text-sm text-muted-foreground">
                  At least 8 characters. Share it with the learner securely.
                </p>
              )}
            </div>
          ) : null}

          <SheetFooter className="mt-auto flex-row justify-end gap-2 px-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add learner"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
