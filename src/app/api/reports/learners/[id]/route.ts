import type { NextRequest } from "next/server";
import { requireApiRole } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/errors";
import { csvResponse } from "@/server/http";
import { learnerReportCsv } from "@/server/services/report.service";

/** GET /api/reports/learners/:id : CSV report for one learner (one row per attempt). ADMIN only. */
export async function GET(_request: NextRequest, context: RouteContext<"/api/reports/learners/[id]">) {
  try {
    await requireApiRole("ADMIN");
    const { id } = await context.params;
    return csvResponse(await learnerReportCsv(id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
