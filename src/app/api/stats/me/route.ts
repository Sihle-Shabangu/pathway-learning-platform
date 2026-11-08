import { NextResponse } from "next/server";
import { requireApiRole } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/errors";
import { getLearnerProgress } from "@/server/services/learner-portal.service";

/** GET /api/stats/me : the signed-in learner's own progress statistics and history. LEARNER only. */
export async function GET() {
  try {
    const learner = await requireApiRole("LEARNER");
    return NextResponse.json(await getLearnerProgress(learner.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
