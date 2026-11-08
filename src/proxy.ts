import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { redirectFor } from "@/lib/route-access";
import { authConfig } from "@/server/auth/auth.config";

// Uses the database-free config: this only decodes the JWT cookie.
// Pages and APIs still re-check the role on the server (see src/server/auth/guards.ts).
const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const role = request.auth?.user?.role ?? null;
  const target = redirectFor(request.nextUrl.pathname, role);
  if (target) {
    return NextResponse.redirect(new URL(target, request.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/learner/:path*"],
};
