"use server";

import { signOut } from "./index";

/** Clears the session cookie and returns to the login page. */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
