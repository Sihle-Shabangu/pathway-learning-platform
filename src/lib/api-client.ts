/** Error thrown for any non-2xx API response, carrying the standard { error } body. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/**
 * fetch() wrapper for our JSON API. Resolves with the parsed body, or throws ApiError.
 * Network failures become an ApiError with code NETWORK_ERROR so the UI can offer a retry.
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection and try again.");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? "Something went wrong. Please try again.",
      error?.fields,
    );
  }
  return body as T;
}

export function postJson<T>(url: string, data: unknown, method: "POST" | "PATCH" = "POST"): Promise<T> {
  return apiFetch<T>(url, { method, body: JSON.stringify(data) });
}

/** The message to show for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}
