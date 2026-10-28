/** Length of each recorded audio part. The backend transcribes finished files, not a live stream. */
export const CHUNK_MS = 15000;
/** Parts shorter than this are skipped because the speech model cannot use them. */
export const MIN_CHUNK_MS = 1200;

const DEVICE_KEY = "voxta.audio.deviceId";

export function pickMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export function getSavedDeviceId(): string | undefined {
  try {
    return localStorage.getItem(DEVICE_KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function saveDeviceId(id: string | undefined): void {
  try {
    if (id) localStorage.setItem(DEVICE_KEY, id);
    else localStorage.removeItem(DEVICE_KEY);
  } catch {
    /* storage unavailable, ignore */
  }
}