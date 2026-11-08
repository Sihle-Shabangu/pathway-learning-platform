import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { slugify } from "@/server/services/report.service";

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("Sipho Ndlovu")).toBe("Sipho Ndlovu");
    expect(csvCell(85)).toBe("85");
  });

  it("writes null and undefined as empty", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("Mokoena, Lerato")).toBe('"Mokoena, Lerato"');
    expect(csvCell('The "dead" workstation')).toBe('"The ""dead"" workstation"');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
  });

  it("neutralises spreadsheet formulas (CSV injection)", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe("\"'=HYPERLINK(\"\"http://evil\"\")\"");
    expect(csvCell("+27 82 000")).toBe("'+27 82 000");
    expect(csvCell("@sum(A1)")).toBe("'@sum(A1)");
    expect(csvCell("-15")).toBe("'-15");
  });

  it("does not alter negative numbers passed as numbers", () => {
    expect(csvCell(-15)).toBe("-15");
  });
});

describe("toCsv", () => {
  it("writes a header row and CRLF line endings", () => {
    expect(toCsv(["Name", "Score"], [["Thabo", 100], ["Ayesha, P", null]])).toBe(
      'Name,Score\r\nThabo,100\r\n"Ayesha, P",\r\n',
    );
  });
});

describe("slugify", () => {
  it("makes names safe for filenames", () => {
    expect(slugify("Pieter van Wyk")).toBe("pieter-van-wyk");
    expect(slugify("  Ayesha O'Brien! ")).toBe("ayesha-o-brien");
  });
});
