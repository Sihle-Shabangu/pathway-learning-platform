import { describe, expect, it } from "vitest";
import { formatDueDate, formatPercent, formatRelative, formatShortDueDate } from "@/lib/format";

describe("formatDueDate", () => {
  it("shows the calendar day that was picked, whatever the viewer's time zone", () => {
    // Stored as the end of 31 Dec in UTC; in South Africa (UTC+2) that instant is already 1 Jan.
    expect(formatDueDate("2030-12-31T23:59:59.999Z")).toBe("31 Dec 2030");
    expect(formatShortDueDate("2030-12-31T23:59:59.999Z")).toBe("31 Dec");
  });

  it("shows a dash when there is no due date", () => {
    expect(formatDueDate(null)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("never shows NaN", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(0)).toBe("0%");
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  it("describes recent times in plain words", () => {
    expect(formatRelative("2026-11-08T11:59:30Z", now)).toBe("Just now");
    expect(formatRelative("2026-11-08T11:55:00Z", now)).toBe("5m ago");
    expect(formatRelative("2026-11-08T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelative("2026-11-06T12:00:00Z", now)).toBe("2d ago");
    expect(formatRelative(null, now)).toBe("Never");
  });
});
