import { NextResponse, type NextRequest } from "next/server";
import { startSimulationSchema } from "@/lib/validation/simulation";
import { requireApiRole } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/errors";
import { readJson } from "@/server/http";
import { startOrResume } from "@/server/services/simulation.service";

/** POST /api/simulation/start { assignmentId } : start or resume the learner's own attempt. LEARNER only. */
export async function POST(request: NextRequest) {
  try {
    const learner = await requireApiRole("LEARNER");
    const { assignmentId } = startSimulationSchema.parse(await readJson(request));
    return NextResponse.json(await startOrResume(learner, assignmentId));
  } catch (error) {
    return toErrorResponse(error);
  }
}
