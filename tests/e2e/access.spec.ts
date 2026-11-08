import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("API access control", () => {
  test("a learner cannot fetch another learner's attempt (404)", async ({ browser }) => {
    // Find one of Thabo's attempts using his own session.
    const thabo = await browser.newContext();
    const thaboPage = await thabo.newPage();
    await signIn(thaboPage, "thabo@pathway.test", /\/learner$/);
    const progress = await (await thaboPage.request.get("/api/stats/me")).json();
    const attemptId: string = progress.history[0].attemptId;
    expect(attemptId).toBeTruthy();
    // Thabo himself can read it.
    expect((await thaboPage.request.get(`/api/simulation/attempts/${attemptId}`)).status()).toBe(200);
    await thabo.close();

    // Lerato, in a separate session, cannot read or act on it.
    const lerato = await browser.newContext();
    const leratoPage = await lerato.newPage();
    await signIn(leratoPage, "lerato@pathway.test", /\/learner$/);
    const read = await leratoPage.request.get(`/api/simulation/attempts/${attemptId}`);
    expect([403, 404]).toContain(read.status());
    const body = await read.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(JSON.stringify(body)).not.toMatch(/FAULTY_RAM|FAILING_PSU|CPU_OVERHEATING|decisions/);

    const act = await leratoPage.request.post(`/api/simulation/attempts/${attemptId}/actions`, {
      data: { actionId: "check_outlet", expectedStep: 0 },
    });
    expect(act.status()).toBe(404);
    await lerato.close();
  });

  test("a learner cannot call admin APIs (403)", async ({ page }) => {
    await signIn(page, "lerato@pathway.test", /\/learner$/);
    for (const url of ["/api/learners", "/api/stats", "/api/activities"]) {
      const response = await page.request.get(url);
      expect(response.status(), url).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    }
  });

  test("an admin cannot use learner-only APIs (403)", async ({ page }) => {
    await signIn(page, "admin@pathway.test", /\/admin$/);
    expect((await page.request.get("/api/assignments/mine")).status()).toBe(403);
  });

  test("signed-out API requests get a 401 JSON error, not a page", async ({ request }) => {
    const response = await request.get("/api/stats");
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
  });
});
