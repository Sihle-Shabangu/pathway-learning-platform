import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/errors";
import { getAttemptView } from "@/server/services/simulation.service";

/** GET /api/simulation/attempts/:attemptId : the learner's own attempt (fault hidden until complete). LEARNER only. */
export async function GET(_request: NextRequest, context: RouteContext<"/api/simulation/attempts/[attemptId]">) {
  try {
    const learner = await requireApiRole("LEARNER");
    const { attemptId } = await context.params;
    return NextResponse.json(await getAttemptView(learner, attemptId));
  } catch (error) {
    return toErrorResponse(error);
  }
}
