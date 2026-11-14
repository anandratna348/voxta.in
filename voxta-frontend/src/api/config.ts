/**
 * Central, non-secret runtime configuration.
 * All values come from Vite env variables so URLs are never hard coded in screens.
 */
const env = import.meta.env;

export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// In plain browser dev the backend has no CORS headers, so we go through
// the Vite proxy. Inside Tauri we call the real URL via the Rust HTTP plugin.
const useDevProxy = env.DEV && !isTauri && env.VITE_USE_DEV_PROXY !== "false";

const directBase = env.VITE_API_BASE_URL ?? "http://127.0.0.1:8765/api/v1";

export const config = {
  apiBaseUrl: useDevProxy ? "/api/v1" : directBase,
  healthUrl: useDevProxy ? "/health" : `${new URL(directBase).origin}/health`,
  displayBackendUrl: directBase,
  healthPollMs: Number(env.VITE_HEALTH_POLL_MS ?? 15000),
  requestTimeoutMs: 45000,
  /** Transcription and AI calls can take much longer than normal requests. */
  longRequestTimeoutMs: 120000,
  /** Public license settings. The public key is not a secret, it only verifies signatures. */
  licenseApiUrl: (env.VITE_LICENSE_API_URL ?? "").trim(),
  licensePublicKey: (env.VITE_LICENSE_PUBLIC_KEY ?? "").trim(),
  purchaseUrl: (env.VITE_PURCHASE_URL ?? "").trim(),
  appVersion: "0.1.0",
} as const;