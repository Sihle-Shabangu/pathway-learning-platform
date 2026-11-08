import { validationError } from "@/server/errors";

/** Reads a JSON request body. Malformed JSON becomes a 400, not a 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw validationError("The request body must be valid JSON.");
  }
}

/** Turns URLSearchParams into a plain object for Zod to parse. Empty values are dropped. */
export function searchParamsToObject(params: URLSearchParams): Record<string, string> {
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    if (value !== "") result[key] = value;
  });
  return result;
}
