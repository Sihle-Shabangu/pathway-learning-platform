import { NextResponse, type NextRequest } from "next/server";
import { auditQuerySchema } from "@/lib/validation/audit";
import { requireApiRole } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/errors";
import { searchParamsToObject } from "@/server/http";
import { listAuditLogs } from "@/server/services/audit.service";

/** GET /api/audit?action=&actor=&from=&to=&page=&pageSize= : the audit log, newest first. ADMIN only. */
export async function GET(request: NextRequest) {
  try {
    await requireApiRole("ADMIN");
    const query = auditQuerySchema.parse(searchParamsToObject(request.nextUrl.searchParams));
    return NextResponse.json(await listAuditLogs(query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
