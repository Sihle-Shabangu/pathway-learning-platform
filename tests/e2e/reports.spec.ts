import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("CSV exports", () => {
  test("an admin downloads all learner results", async ({ page }) => {
    await signIn(page, "admin@pathway.test", /\/admin$/);
    const response = await page.request.get("/api/reports/learners");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["content-disposition"]).toMatch(/attachment; filename="pathway-all-results-\d{4}-\d{2}-\d{2}\.csv"/);

    const text = await response.text();
    const lines = text.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[0]).toBe(
      "Learner,Email,Cohort,Learner status,Activity,Assignment status,Due date,Overdue,Completed at,Best score,Completed attempts",
    );
    expect(text).toContain("Thabo Mthembu,thabo@pathway.test,2025-A,ACTIVE,Diagnose the dead workstation,COMPLETED");
    expect(text).toContain("pieter@pathway.test,2025-A,INACTIVE"); // inactive learners included and labelled
  });

  test("an admin downloads one learner's report; the fault appears only for completed attempts", async ({ page }) => {
    await signIn(page, "admin@pathway.test", /\/admin$/);
    const list = await (await page.request.get("/api/learners?search=lerato")).json();
    const lerato = list.items[0];
    const response = await page.request.get(`/api/reports/learners/${lerato.id}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-disposition"]).toContain("pathway-lerato-mokoena-report-");
    const rows = (await response.text()).replace(/^﻿/, "").trim().split("\r\n");
    expect(rows[0]).toContain("Hidden fault");
    // Lerato's seeded attempt is in progress, so the last column (fault) must be empty.
    expect(rows[1].endsWith(",")).toBe(true);
    expect(rows[1]).not.toMatch(/overheating|RAM module|power supply/i);
  });

  test("learners cannot export reports (403)", async ({ page }) => {
    await signIn(page, "lerato@pathway.test", /\/learner$/);
    expect((await page.request.get("/api/reports/learners")).status()).toBe(403);
  });

  test("an unknown learner id returns a 404 JSON error", async ({ page }) => {
    await signIn(page, "admin@pathway.test", /\/admin$/);
    const response = await page.request.get("/api/reports/learners/does-not-exist");
    expect(response.status()).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });
});
