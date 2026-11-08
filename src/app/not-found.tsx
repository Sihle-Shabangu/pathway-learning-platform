import { Compass } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />
      <div className="flex size-16 items-center justify-center rounded-full bg-primary-soft">
        <Compass className="size-8 text-primary" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="font-mono text-sm text-muted-foreground">Error 404</p>
        <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="max-w-md text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved. Check the address, or head back to your dashboard.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/">Go to my dashboard</Link>
      </Button>
    </main>
  );
}
