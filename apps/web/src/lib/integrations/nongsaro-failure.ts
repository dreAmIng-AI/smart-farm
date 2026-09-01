const NONGSARO_FAILURE_CODES = [
  "NONGSARO_API_KEY_NOT_CONFIGURED",
  "NONGSARO_CROP_NOT_FOUND",
  "NONGSARO_DISEASE_PEST_CATEGORY_NOT_FOUND",
  "NONGSARO_EMPTY_RESPONSE",
  "NONGSARO_MALFORMED_RESPONSE",
  "NONGSARO_NETWORK_FAILED",
  "NONGSARO_REQUEST_FAILED",
  "NONGSARO_RESPONSE_ERROR",
  "NONGSARO_TIMEOUT",
  "NONGSARO_UNKNOWN_ERROR",
] as const;

export type NongsaroFailureCode = (typeof NONGSARO_FAILURE_CODES)[number];

function isNongsaroFailureCode(value: string): value is NongsaroFailureCode {
  return (NONGSARO_FAILURE_CODES as readonly string[]).includes(value);
}

/**
 * Converts provider errors to a log-safe, fixed vocabulary. The route handlers
 * intentionally log this classification only: never an API key, request URL,
 * response body, Farm identifier, or a provider error message.
 */
export function getNongsaroFailureCode(error: unknown): NongsaroFailureCode {
  if (error instanceof Error) {
    if (isNongsaroFailureCode(error.message)) return error.message;
    if (error.name === "AbortError" || error.name === "TimeoutError") return "NONGSARO_TIMEOUT";
    if (error instanceof TypeError) return "NONGSARO_NETWORK_FAILED";
  }

  return "NONGSARO_UNKNOWN_ERROR";
}
