import { NextResponse, type NextRequest } from "next/server";
import { applyActionSchema } from "@/lib/validation/simulation";
import { requireApiRole } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/errors";
import { readJson } from "@/server/http";
import { applyAction } from "@/server/services/simulation.service";

/**
 * POST /api/simulation/attempts/:attemptId/actions { actionId, expectedStep }
 * Applies one action on the server. 409 if expectedStep is stale (duplicate submission). LEARNER only.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/simulation/attempts/[attemptId]/actions">) {
  try {
    const learner = await requireApiRole("LEARNER");
    const { attemptId } = await context.params;
    const input = applyActionSchema.parse(await readJson(request));
    return NextResponse.json(await applyAction(learner, attemptId, input));
  } catch (error) {
    return toErrorResponse(error);
  }
}
