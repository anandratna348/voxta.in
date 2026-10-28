import type { TranscriptSegment } from "@/api/types";

/**
 * The backend stores segment times relative to each uploaded audio part, so every
 * part restarts at 0. We remember where each part began in the recording, per
 * segment id, on this computer. Segments without a remembered offset fall back
 * to the raw stored time and are shown as approximate.
 */
const key = (sessionId: string) => `voxta.offsets.${sessionId}`;

export type OffsetMap = Record<string, number>;

export function loadOffsets(sessionId: string): OffsetMap {
  try {
    const raw = localStorage.getItem(key(sessionId));
    return raw ? (JSON.parse(raw) as OffsetMap) : {};
  } catch {
    return {};
  }
}

export function saveOffsets(sessionId: string, entries: OffsetMap): void {
  try {
    localStorage.setItem(key(sessionId), JSON.stringify({ ...loadOffsets(sessionId), ...entries }));
  } catch {
    /* storage unavailable, timestamps will be approximate */
  }
}

export function displayTime(segment: TranscriptSegment, offsets: OffsetMap): { ms: number; exact: boolean } {
  const offset = offsets[segment.id];
  return offset === undefined
    ? { ms: segment.start_ms, exact: false }
    : { ms: offset + segment.start_ms, exact: true };
}