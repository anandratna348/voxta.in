import { useEffect, useSyncExternalStore } from "react";
import { isTauri } from "@/api/config";
import type { StoredAnswer } from "@/lib/copilotStore";
import { displayTime, type OffsetMap } from "@/lib/timeline";
import type { TranscriptSegment } from "@/api/types";
import { getState, publishSnapshot, subscribe } from "./controller";
import type { OverlayStatus } from "./types";

export function useOverlayState() {
  return useSyncExternalStore(subscribe, getState, getState);
}

interface PublisherInput {
  title: string;
  status: OverlayStatus;
  analysing: boolean;
  autoDetect: boolean;
  copilotEnabled: boolean;
  segments: TranscriptSegment[] | null;
  offsets: OffsetMap;
  answer: StoredAnswer | null;
}

/** Sends the meeting's live transcript and latest answer to the overlay. */
export function useOverlayPublisher(input: PublisherInput) {
  const { title, status, analysing, autoDetect, copilotEnabled, segments, offsets, answer } = input;

  useEffect(() => {
    if (!isTauri) return;
    const timer = window.setTimeout(() => {
      void publishSnapshot({
        title,
        status,
        analysing,
        autoDetect,
        copilotEnabled,
        lines: (segments ?? []).slice(-12).map((s) => {
          const t = displayTime(s, offsets);
          return { id: s.id, text: s.text, timeMs: t.ms, exact: t.exact };
        }),
        answer: answer ? { id: answer.id, question: answer.question, answer: answer.answer, createdAt: answer.createdAt } : null,
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [title, status, analysing, autoDetect, copilotEnabled, segments, offsets, answer]);

  // Leaving the meeting screen tells the overlay nothing is live.
  useEffect(() => () => void publishSnapshot(null), []);
}