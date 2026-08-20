const REQUEST_ID_RE = /^[A-Za-z0-9._-]{8,128}$/;

export function resolveRequestId(incoming: string | null | undefined): string {
  const trimmed = incoming?.trim() ?? "";
  if (REQUEST_ID_RE.test(trimmed)) return trimmed;
  return crypto.randomUUID();
}
