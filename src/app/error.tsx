"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Shown when a page throws while rendering (a 500). Offers a retry without a full reload. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="font-mono text-sm text-muted-foreground">Error 500</p>
        <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="max-w-md text-muted-foreground">
          An unexpected error stopped this page from loading. Your saved work is safe. Try again, or go back to your
          dashboard.
        </p>
        {error.digest ? <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go to my dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
