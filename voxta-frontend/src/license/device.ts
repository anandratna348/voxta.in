import { isTauri } from "@/api/config";
import { sha256Hex } from "./crypto";

const FALLBACK_KEY = "voxta.device.v1";
let cached: string | null = null;

/**
 * Identifies this computer without sending anything personal. In the desktop app the id comes
 * from Windows through a small Rust command. In a plain browser (development only) a random id is used.
 * Only a salted hash ever leaves the app.
 */
export async function getDeviceHash(): Promise<string> {
  if (cached) return cached;
  let raw: string | null = null;

  if (isTauri) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      raw = await invoke<string>("device_id");
    } catch {
      raw = null;
    }
  }
  if (!raw) {
    try {
      raw = localStorage.getItem(FALLBACK_KEY) ?? crypto.randomUUID();
      localStorage.setItem(FALLBACK_KEY, raw);
    } catch {
      raw = crypto.randomUUID();
    }
  }
  cached = await sha256Hex(`voxta-device-v1:${raw}`);
  return cached;
}

export const deviceLabel = () => (navigator.userAgent.includes("Windows") ? "Windows PC" : "Computer");