import { NextResponse, type NextRequest } from "next/server";
import { createLearnerSchema, listLearnersQuerySchema } from "@/lib/validation/learner";
import { requireApiRole } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/errors";
import { readJson, searchParamsToObject } from "@/server/http";
import { createLearner, listLearners } from "@/server/services/learner.service";

/** GET /api/learners?search=&status=&cohort=&page=&pageSize= : paginated learner list. ADMIN only. */
export async function GET(request: NextRequest) {
  try {
    await requireApiRole("ADMIN");
    const query = listLearnersQuerySchema.parse(searchParamsToObject(request.nextUrl.searchParams));
    return NextResponse.json(await listLearners(query));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/learners: create a learner. ADMIN only. */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireApiRole("ADMIN");
    const input = createLearnerSchema.parse(await readJson(request));
    return NextResponse.json(await createLearner(admin.id, input), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
