import { config, isTauri } from "./config";
import { ApiError, readDetail } from "./errors";

type FetchFn = typeof fetch;
let cachedFetch: Promise<FetchFn> | null = null;

/** Tauri uses the Rust HTTP plugin (no CORS). A browser uses native fetch. */
function getFetch(): Promise<FetchFn> {
  if (!isTauri) return Promise.resolve(window.fetch.bind(window));
  cachedFetch ??= import("@tauri-apps/plugin-http").then((m) => m.fetch as FetchFn);
  return cachedFetch;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | number | undefined>;
  json?: unknown;
  form?: FormData;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Absolute URL override, used for the health check. */
  absoluteUrl?: string;
}

function buildUrl(path: string, query?: RequestOptions["query"], absoluteUrl?: string): string {
  const base = absoluteUrl ?? `${config.apiBaseUrl}${path}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), options.timeoutMs ?? config.requestTimeoutMs);
  options.signal?.addEventListener("abort", () => controller.abort(options.signal?.reason));

  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  } else if (options.form) {
    body = options.form; // the runtime sets the multipart boundary
  }

  try {
    const doFetch = await getFetch();
    const response = await doFetch(buildUrl(path, options.query, options.absoluteUrl), {
      method: options.method ?? "GET",
      headers,
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = `Request failed (${response.status}).`;
      try {
        message = readDetail(await response.json()) ?? message;
      } catch {
        /* body was not JSON, keep the generic message */
      }
      throw new ApiError("http", message, response.status);
    }
    return response;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted && controller.signal.reason === "timeout") {
      throw new ApiError("timeout", "The backend took too long to respond.");
    }
    if (options.signal?.aborted) throw error;
    throw new ApiError("network", "Cannot reach the Voxta backend. Check that it is running.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  return (await response.json()) as T;
}

export async function requestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const response = await send(path, options);
  return response.blob();
}