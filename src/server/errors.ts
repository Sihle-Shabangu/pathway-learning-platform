import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export type FieldErrors = Record<string, string>;

/** An error that is safe to show to the user. Services throw these. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fields?: FieldErrors;

  constructor(code: ErrorCode, message: string, fields?: FieldErrors) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fields = fields;
  }

  get status(): number {
    return STATUS_BY_CODE[this.code];
  }
}

export const unauthenticated = () => new AppError("UNAUTHENTICATED", "Please sign in.");
export const forbidden = () => new AppError("FORBIDDEN", "You do not have access to this resource.");
export const notFound = (what = "Resource") => new AppError("NOT_FOUND", `${what} not found.`);
export const conflict = (message: string) => new AppError("CONFLICT", message);
export const validationError = (message: string, fields?: FieldErrors) =>
  new AppError("VALIDATION_ERROR", message, fields);

/** Turns a ZodError into { fieldName: firstMessage }. */
export function zodFieldErrors(error: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/** The single place where errors become HTTP responses. Never leaks stack traces. */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, fields: error.fields } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please fix the highlighted fields.",
          fields: zodFieldErrors(error),
        },
      },
      { status: 400 },
    );
  }
  console.error("Unhandled error in route handler:", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}
