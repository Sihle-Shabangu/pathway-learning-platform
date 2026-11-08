import { CheckCircle2, XCircle } from "lucide-react";
import type { Decision } from "@/lib/simulation/types";
import { cn } from "@/lib/utils";

const GROUP_LABELS: Record<Decision["group"], string> = {
  investigate: "Investigate",
  safety: "Safety",
  repair: "Repair",
  diagnose: "Diagnose",
};

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "0";
}

/** Step-by-step list of a learner's decisions with feedback and score change. Shared by admin and learner views. */
export function AttemptDecisions({ decisions }: { decisions: Decision[] }) {
  if (decisions.length === 0) {
    return <p className="text-sm text-muted-foreground">No actions taken yet.</p>;
  }
  return (
    <ol className="space-y-2">
      {decisions.map((decision) => (
        <li
          key={decision.step}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-3",
            decision.correct ? "bg-surface" : "border-warning/40 bg-amber-50/60",
          )}
        >
          {decision.correct ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Good decision" />
          ) : (
            <XCircle className="mt-0.5 size-5 shrink-0 text-warning-text" aria-label="Costly decision" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Step {decision.step}: {decision.actionLabel}{" "}
              <span className="font-normal text-muted-foreground">({GROUP_LABELS[decision.group]})</span>
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{decision.feedback}</p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-semibold",
              decision.scoreDelta < 0 ? "bg-red-50 text-[#b91c1c]" : "bg-green-50 text-success-text",
            )}
          >
            {formatDelta(decision.scoreDelta)} pts
          </span>
        </li>
      ))}
    </ol>
  );
}
