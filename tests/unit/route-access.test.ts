import { describe, expect, it } from "vitest";
import { redirectFor } from "@/lib/route-access";

describe("redirectFor (route protection rules used by src/proxy.ts)", () => {
  it("sends signed-out visitors of protected areas to /login", () => {
    expect(redirectFor("/admin", null)).toBe("/login");
    expect(redirectFor("/admin/learners/abc", null)).toBe("/login");
    expect(redirectFor("/learner", null)).toBe("/login");
    expect(redirectFor("/learner/simulation/xyz", null)).toBe("/login");
    expect(redirectFor("/", null)).toBe("/login");
  });

  it("lets signed-out visitors see the login page", () => {
    expect(redirectFor("/login", null)).toBeNull();
  });

  it("sends a learner who opens an admin page to the learner dashboard", () => {
    expect(redirectFor("/admin", "LEARNER")).toBe("/learner");
    expect(redirectFor("/admin/audit", "LEARNER")).toBe("/learner");
  });

  it("sends an admin who opens a learner page to the admin dashboard", () => {
    expect(redirectFor("/learner", "ADMIN")).toBe("/admin");
    expect(redirectFor("/learner/progress", "ADMIN")).toBe("/admin");
  });

  it("lets each role into its own area", () => {
    expect(redirectFor("/admin/learners", "ADMIN")).toBeNull();
    expect(redirectFor("/learner/progress", "LEARNER")).toBeNull();
  });

  it("sends signed-in users away from /login and / to their dashboard", () => {
    expect(redirectFor("/login", "ADMIN")).toBe("/admin");
    expect(redirectFor("/", "LEARNER")).toBe("/learner");
  });

  it("does not treat look-alike paths as protected areas", () => {
    expect(redirectFor("/administrator", null)).toBeNull();
    expect(redirectFor("/learners-guide", null)).toBeNull();
  });
});
