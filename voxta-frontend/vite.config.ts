import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The backend has no CORS middleware, so during `npm run dev` in a normal
// browser we proxy API calls through Vite. Inside Tauri the app uses the
// Rust-side HTTP plugin instead (see src/api/http.ts), which has no CORS.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_BACKEND_ORIGIN || "http://127.0.0.1:8765";

  return {
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      proxy: {
        "/api": { target: backend, changeOrigin: true },
        "/health": { target: backend, changeOrigin: true },
      },
    },
  };
});