import { NextResponse, type NextRequest } from "next/server";
import { updateLearnerSchema } from "@/lib/validation/learner";
import { requireApiRole } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/errors";
import { readJson } from "@/server/http";
import { getLearnerDetail, updateLearner } from "@/server/services/learner.service";

/** GET /api/learners/:id : profile, stats, assignments and attempts. ADMIN only. */
export async function GET(_request: NextRequest, context: RouteContext<"/api/learners/[id]">) {
  try {
    await requireApiRole("ADMIN");
    const { id } = await context.params;
    return NextResponse.json(await getLearnerDetail(id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** PATCH /api/learners/:id : edit fields or set status (deactivate = soft delete). ADMIN only. */
export async function PATCH(request: NextRequest, context: RouteContext<"/api/learners/[id]">) {
  try {
    const admin = await requireApiRole("ADMIN");
    const { id } = await context.params;
    const input = updateLearnerSchema.parse(await readJson(request));
    return NextResponse.json(await updateLearner(admin.id, id, input));
  } catch (error) {
    return toErrorResponse(error);
  }
}
