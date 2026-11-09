/** Per-meeting data the app keeps on this computer: copilot answers and recording time offsets. */
const PREFIXES = ["voxta.offsets.", "voxta.copilot."];
const KEEP = new Set(["voxta.copilot.context", "voxta.copilot.auto"]);

function keys(): string[] {
  const found: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && PREFIXES.some((p) => key.startsWith(p)) && !KEEP.has(key)) found.push(key);
    }
  } catch {
    /* storage unavailable */
  }
  return found;
}

export const countLocalMeetingData = () => keys().length;

export function clearLocalMeetingData(): number {
  const found = keys();
  found.forEach((k) => localStorage.removeItem(k));
  return found.length;
}