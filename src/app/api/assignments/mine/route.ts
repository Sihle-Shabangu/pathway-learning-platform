import { NextResponse } from "next/server";
import { requireApiRole } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/errors";
import { getLearnerHome } from "@/server/services/learner-portal.service";

/** GET /api/assignments/mine : the signed-in learner's assignments and progress. LEARNER only. */
export async function GET() {
  try {
    const learner = await requireApiRole("LEARNER");
    return NextResponse.json(await getLearnerHome(learner.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
