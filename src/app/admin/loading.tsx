import { PageSkeleton } from "@/components/states";

// Shown while the server checks the session and renders an /admin page.
export default function Loading() {
  return <PageSkeleton />;
}
