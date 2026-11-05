/**
 * Typed result returned by Server Actions and services.
 * Expected failures (validation, not found, conflicts) are values, not thrown errors.
 */
export type ErrorCode = "VALIDATION" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "INTERNAL";

export type AppError = {
  code: ErrorCode;
  message: string;
  /** Field-level messages, e.g. from Zod, keyed by field name. */
  fieldErrors?: Record<string, string[]>;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const err = (
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): Result<never> => ({ ok: false, error: { code, message, fieldErrors } });
