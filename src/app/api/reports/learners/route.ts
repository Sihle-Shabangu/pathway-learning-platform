import { requireApiRole } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/errors";
import { csvResponse } from "@/server/http";
import { allResultsCsv } from "@/server/services/report.service";

/** GET /api/reports/learners : CSV of every learner's results (one row per assignment). ADMIN only. */
export async function GET() {
  try {
    await requireApiRole("ADMIN");
    return csvResponse(await allResultsCsv());
  } catch (error) {
    return toErrorResponse(error);
  }
}
