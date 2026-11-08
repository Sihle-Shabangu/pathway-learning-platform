import { PageSkeleton } from "@/components/states";

// Shown while the server checks the session and renders a /learner page.
export default function Loading() {
  return <PageSkeleton cards={2} />;
}
