import { NextResponse } from "next/server";
import { requireApiRole } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/errors";
import { getDashboard } from "@/server/services/stats.service";

/** GET /api/stats: everything the admin dashboard shows. ADMIN only. */
export async function GET() {
  try {
    await requireApiRole("ADMIN");
    return NextResponse.json(await getDashboard());
  } catch (error) {
    return toErrorResponse(error);
  }
}
