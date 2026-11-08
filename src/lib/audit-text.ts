/** Human-readable descriptions of audit log actions. Pure, so it can be shared and tested. */

type Metadata = Record<string, unknown> | null | undefined;

function str(metadata: Metadata, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function num(metadata: Metadata, key: string): number | undefined {
  const value = metadata?.[key];
  return typeof value === "number" ? value : undefined;
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "learner.created": "Learner added",
  "learner.updated": "Learner edited",
  "learner.deactivated": "Learner deactivated",
  "learner.reactivated": "Learner reactivated",
  "activity.created": "Activity created",
  "assignment.created": "Activity assigned",
  "simulation.started": "Simulation started",
  "simulation.action": "Simulation step",
  "simulation.completed": "Simulation completed",
};

/** e.g. "completed the simulation with 86/100". The actor's name is shown separately. */
export function describeAuditAction(action: string, rawMetadata: unknown): string {
  const metadata = (rawMetadata && typeof rawMetadata === "object" ? rawMetadata : null) as Metadata;
  switch (action) {
    case "auth.login":
      return "signed in";
    case "learner.created":
      return `added learner ${str(metadata, "name") ?? ""}`.trim();
    case "learner.updated":
      return `edited learner ${str(metadata, "name") ?? ""}`.trim();
    case "learner.deactivated":
      return `deactivated ${str(metadata, "name") ?? "a learner"}`;
    case "learner.reactivated":
      return `reactivated ${str(metadata, "name") ?? "a learner"}`;
    case "activity.created":
      return `created activity "${str(metadata, "title") ?? "Untitled"}"`;
    case "assignment.created": {
      const added = num(metadata, "added");
      const title = str(metadata, "title");
      if (added !== undefined && title) {
        return `assigned "${title}" to ${added} learner${added === 1 ? "" : "s"}`;
      }
      return "assigned an activity";
    }
    case "simulation.started":
      return "started a simulation";
    case "simulation.action":
      return `took step ${num(metadata, "step") ?? ""} in a simulation`.replace("  ", " ");
    case "simulation.completed": {
      const score = num(metadata, "score");
      return score !== undefined ? `completed a simulation with ${score}/100` : "completed a simulation";
    }
    default:
      return action;
  }
}
