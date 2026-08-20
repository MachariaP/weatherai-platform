import type { WeatherError } from "./types";

const TITLES: Record<string, string> = {
  bad_request: "Invalid coordinates",
  upstream_auth: "Weather unavailable",
  plan_restriction: "AI insight unavailable",
  rate_limit: "Weather service is busy",
  upstream_error: "Weather unavailable",
  malformed_response: "Weather data incomplete",
  timeout: "Request timed out",
  network_error: "Connection problem",
  backend_unavailable: "Weather unavailable",
  backend_timeout: "Request timed out",
};

const BODIES: Record<string, string> = {
  bad_request:
    "Latitude must be between -90 and 90, and longitude between -180 and 180.",
  upstream_auth: "Weather lookup is temporarily unavailable. Try again later.",
  plan_restriction: "AI insight is not available for this request.",
  rate_limit: "Too many requests. Wait a moment and try again.",
  upstream_error:
    "The weather service is not available right now. Try again in a moment.",
  malformed_response:
    "Some weather details could not be shown. Try again to reload.",
  timeout: "The request took too long. Try again in a moment.",
  network_error:
    "We could not reach the weather service. Check your connection and try again.",
  backend_unavailable:
    "The weather service is not available right now. Try again in a moment.",
  backend_timeout: "The request took too long. Try again in a moment.",
};

const FALLBACK_TITLE = "Something went wrong";
const FALLBACK_BODY = "Something went wrong. Try again in a moment.";

function looksUnsafe(message: string): boolean {
  if (message.length > 160) return true;
  if (message.includes("\n") || message.includes("\t")) return true;
  if (/https?:\/\//i.test(message)) return true;
  if (/localhost|127\.0\.0\.1/i.test(message)) return true;
  if (/stack|traceback|exception/i.test(message)) return true;
  if (/\bat\s+\S+\s+\(/i.test(message)) return true;
  if (/api[_-]?key|secret|token|authorization/i.test(message)) return true;
  if (/\/home\/|\/usr\/|\/app\/|\\src\\/i.test(message)) return true;
  return false;
}

/**
 * Map a WeatherError to copy the UI can show.
 *
 * Never returns stack traces, internal paths, URLs, or secrets.
 */
export function userFacingError(error: WeatherError): { title: string; body: string } {
  const title = TITLES[error.error] ?? FALLBACK_TITLE;
  const mapped = BODIES[error.error];
  const raw = error.message?.trim() ?? "";

  if (error.error === "bad_request" && raw && !looksUnsafe(raw)) {
    return { title, body: raw };
  }

  if (mapped) {
    return { title, body: mapped };
  }

  if (raw && !looksUnsafe(raw)) {
    return { title, body: raw };
  }

  return { title, body: FALLBACK_BODY };
}
