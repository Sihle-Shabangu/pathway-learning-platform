import { NextResponse, type NextRequest } from "next/server";
import { assignActivitySchema } from "@/lib/validation/activity";
import { requireApiRole } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/errors";
import { readJson } from "@/server/http";
import { assignActivity } from "@/server/services/assignment.service";

/** POST /api/assignments : assign an activity to learners and/or a cohort. ADMIN only. */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireApiRole("ADMIN");
    const input = assignActivitySchema.parse(await readJson(request));
    return NextResponse.json(await assignActivity(admin.id, input), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
