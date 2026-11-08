import { NextResponse, type NextRequest } from "next/server";
import { createActivitySchema } from "@/lib/validation/activity";
import { requireApiRole } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/errors";
import { readJson } from "@/server/http";
import { createActivity, listActivities } from "@/server/services/activity.service";

/** GET /api/activities : activities with completion stats. ADMIN only. */
export async function GET() {
  try {
    await requireApiRole("ADMIN");
    return NextResponse.json(await listActivities());
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/activities : create an activity from a scenario. ADMIN only. */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireApiRole("ADMIN");
    const input = createActivitySchema.parse(await readJson(request));
    return NextResponse.json(await createActivity(admin.id, input), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
