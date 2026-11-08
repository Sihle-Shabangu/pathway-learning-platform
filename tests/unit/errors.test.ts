import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { conflict, forbidden, notFound, toErrorResponse, validationError } from "@/server/errors";

async function bodyOf(response: Response) {
  return response.json();
}

describe("toErrorResponse", () => {
  it("maps AppErrors to their status and the standard error shape", async () => {
    const cases = [
      [forbidden(), 403, "FORBIDDEN"],
      [notFound("Learner"), 404, "NOT_FOUND"],
      [conflict("Step mismatch"), 409, "CONFLICT"],
    ] as const;
    for (const [error, status, code] of cases) {
      const response = toErrorResponse(error);
      expect(response.status).toBe(status);
      const body = await bodyOf(response);
      expect(body.error.code).toBe(code);
      expect(typeof body.error.message).toBe("string");
    }
  });

  it("includes field errors for validation failures", async () => {
    const response = toErrorResponse(validationError("Bad input", { email: "Email already in use." }));
    expect(response.status).toBe(400);
    expect((await bodyOf(response)).error.fields).toEqual({ email: "Email already in use." });
  });

  it("turns a ZodError into a 400 with per-field messages", async () => {
    const result = z.object({ name: z.string().min(2, "Too short") }).safeParse({ name: "a" });
    expect(result.success).toBe(false);
    const response = toErrorResponse(result.error);
    expect(response.status).toBe(400);
    expect((await bodyOf(response)).error.fields).toEqual({ name: "Too short" });
  });

  it("hides the details of unexpected errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = toErrorResponse(new Error("connection string postgres://secret leaked"));
    expect(response.status).toBe(500);
    const body = await bodyOf(response);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(JSON.stringify(body)).not.toContain("stack");
    spy.mockRestore();
  });
});
