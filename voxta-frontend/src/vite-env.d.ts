/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_BACKEND_ORIGIN?: string;
  readonly VITE_USE_DEV_PROXY?: string;
  readonly VITE_ENABLE_DEV_LOGIN?: string;
  readonly VITE_HEALTH_POLL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}