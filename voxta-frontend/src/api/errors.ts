export type ApiErrorKind = "network" | "timeout" | "http";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;

  constructor(kind: ApiErrorKind, message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
  }

  get isOffline(): boolean {
    return this.kind === "network" || this.kind === "timeout";
  }
}

/** Turns anything thrown into a short message that is safe to show to a person. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

/** FastAPI returns `detail` as a string or a list of validation issues. */
/** The license API reports problems as { error: { code, message } }. */
export function readCode(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("error" in body)) return null;
  const err = (body as { error: unknown }).error;
  return err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : null;
}

export function readDetail(body: unknown): string | null {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error: unknown }).error;
    if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  }
  if (!body || typeof body !== "object" || !("detail" in body)) return null;
  const detail = (body as { detail: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : ""))
      .filter(Boolean)
      .join(". ") || null;
  }
  return null;
}