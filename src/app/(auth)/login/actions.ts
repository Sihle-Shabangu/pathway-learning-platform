"use server";

import { AuthError } from "next-auth";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { signIn } from "@/server/auth";
import { zodFieldErrors, type FieldErrors } from "@/server/errors";

export type LoginResult = { ok: true } | { ok: false; message: string; fields?: FieldErrors };

/**
 * Signs the user in. On success Auth.js sets the session cookie and the client
 * navigates to "/", which src/proxy.ts sends to the right dashboard for the role.
 */
export async function loginAction(input: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fields: zodFieldErrors(parsed.error) };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      // Same message for unknown email, wrong password and inactive accounts.
      return { ok: false, message: "Invalid email or password. Please check your details and try again." };
    }
    throw error;
  }
}
