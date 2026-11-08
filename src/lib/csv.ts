/** Minimal, dependency-free CSV writer (RFC 4180 quoting). Pure, so it is easy to test. */

export type CsvValue = string | number | boolean | null | undefined;

/**
 * Formats one cell:
 * - empty for null/undefined,
 * - a leading apostrophe for text starting with = + - @ (or tab/CR), so spreadsheet apps
 *   never run it as a formula ("CSV injection"); numbers are left alone,
 * - wrapped in double quotes (with inner quotes doubled) if it contains a comma, quote or line break.
 */
export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Builds a CSV document with a header row. Uses CRLF line endings, which Excel expects. */
export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  return `${lines.join("\r\n")}\r\n`;
}
