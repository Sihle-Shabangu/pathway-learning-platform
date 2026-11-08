import { Network } from "lucide-react";
import { cn } from "@/lib/utils";

/** The Pathway mark plus wordmark. `subtitle` is optional small caps text below the name. */
export function Logo({ subtitle, className }: { subtitle?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Network className="size-5" aria-hidden="true" />
      </div>
      <div className="leading-tight">
        <span className="block text-lg font-semibold tracking-tight text-foreground">Pathway</span>
        {subtitle ? (
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}
