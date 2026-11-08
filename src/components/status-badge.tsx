import { AlertTriangle, CheckCircle2, CircleDashed, CircleOff, Clock, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "progress" | "neutral" | "warning" | "danger" | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-green-50 text-success-text ring-success/30",
  progress: "bg-primary-soft text-primary-hover ring-primary/30",
  neutral: "bg-muted text-muted-foreground ring-border",
  warning: "bg-amber-50 text-warning-text ring-warning/30",
  danger: "bg-red-50 text-[#b91c1c] ring-destructive/30",
  muted: "bg-muted text-muted-foreground ring-border",
};

const STATUS = {
  COMPLETED: { label: "Completed", tone: "success", icon: CheckCircle2 },
  IN_PROGRESS: { label: "In progress", tone: "progress", icon: PlayCircle },
  NOT_STARTED: { label: "Not started", tone: "neutral", icon: CircleDashed },
  OVERDUE: { label: "Overdue", tone: "danger", icon: Clock },
  ACTIVE: { label: "Active", tone: "success", icon: CheckCircle2 },
  INACTIVE: { label: "Inactive", tone: "muted", icon: CircleOff },
  WARNING: { label: "Needs attention", tone: "warning", icon: AlertTriangle },
} as const;

export type BadgeStatus = keyof typeof STATUS;

/** Status pill: always icon + text, so status is never shown by colour alone. */
export function StatusBadge({ status, label, className }: { status: BadgeStatus; label?: string; className?: string }) {
  const config = STATUS[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONE_CLASSES[config.tone],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label ?? config.label}
    </span>
  );
}
