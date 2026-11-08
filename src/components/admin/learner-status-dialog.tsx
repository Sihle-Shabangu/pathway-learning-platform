"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { errorMessage, postJson } from "@/lib/api-client";

export type StatusTarget = { id: string; name: string; status: "ACTIVE" | "INACTIVE" };

/** Confirm dialog for deactivating (soft delete) or reactivating a learner. */
export function LearnerStatusDialog({
  target,
  onClose,
}: {
  target: StatusTarget | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const deactivating = target?.status === "ACTIVE";

  const mutation = useMutation({
    mutationFn: (learner: StatusTarget) =>
      postJson(`/api/learners/${learner.id}`, { status: learner.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }, "PATCH"),
    onSuccess: (_data, learner) => {
      toast.success(learner.status === "ACTIVE" ? `${learner.name} has been deactivated.` : `${learner.name} is active again.`);
      queryClient.invalidateQueries({ queryKey: ["learners"] });
      queryClient.invalidateQueries({ queryKey: ["learner"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && !mutation.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{deactivating ? `Deactivate ${target?.name}?` : `Reactivate ${target?.name}?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {deactivating
              ? "They won't be able to sign in and will be left out of active-learner metrics. Their history is kept and you can reactivate them at any time."
              : "They will be able to sign in again and will count towards active-learner metrics."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <Button
            variant={deactivating ? "destructive" : "default"}
            disabled={mutation.isPending}
            onClick={() => target && mutation.mutate(target)}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {deactivating ? "Deactivate" : "Reactivate"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
