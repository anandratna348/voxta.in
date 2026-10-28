import { Loader2, MessageSquareText } from "lucide-react";
import { useEffect, useRef } from "react";
import type { TranscriptSegment } from "@/api/types";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/Feedback";
import { CHUNK_MS } from "@/lib/audio";
import { formatTimestamp } from "@/lib/format";
import { displayTime, type OffsetMap } from "@/lib/timeline";

interface Props {
  segments: TranscriptSegment[] | null;
  offsets: OffsetMap;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  recording: boolean;
  pending: number;
}

export function TranscriptPanel({ segments, offsets, loading, error, onRetry, recording, pending }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const count = segments?.length ?? 0;

  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [count, pending]);

  return (
    <section className="flex flex-col rounded-xl2 border border-paper-line bg-paper-raised shadow-card" aria-label="Live transcript">
      <header className="flex items-center justify-between border-b border-paper-line px-6 py-4">
        <h2 className="text-base font-semibold text-indigo-900">Live transcript</h2>
        <span className="text-xs text-indigo-400">{count} {count === 1 ? "segment" : "segments"}</span>
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="max-h-[26rem] min-h-[16rem] flex-1 overflow-y-auto px-6 py-4"
      >
        {error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : loading && !segments ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : count === 0 && pending === 0 ? (
          <EmptyState
            icon={<MessageSquareText className="h-6 w-6" />}
            title={recording ? "Listening" : "No transcript yet"}
            description={
              recording
                ? `Text appears about every ${CHUNK_MS / 1000} seconds once a recorded part is transcribed.`
                : "Start recording and the conversation will appear here with timestamps."
            }
          />
        ) : (
          <ol className="space-y-1">
            {segments?.map((s) => {
              const t = displayTime(s, offsets);
              return (
                <li key={s.id} className="flex gap-4 rounded-xl px-3 py-2.5 hover:bg-lavender-50">
                  <span
                    title={t.exact ? "Time on the recording" : "Approximate, relative to its audio part"}
                    className="mt-0.5 w-14 shrink-0 font-mono text-xs tabular-nums text-indigo-400"
                  >
                    {t.exact ? "" : "~"}{formatTimestamp(t.ms)}
                  </span>
                  <p className="text-[15px] leading-relaxed text-indigo-900">{s.text}</p>
                </li>
              );
            })}
            {pending > 0 && (
              <li className="flex items-center gap-3 px-3 py-2.5 text-sm text-indigo-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Transcribing {pending} audio {pending === 1 ? "part" : "parts"}. Keep Voxta open until this finishes.
              </li>
            )}
          </ol>
        )}
      </div>

      <footer className="border-t border-paper-line px-6 py-3 text-xs text-indigo-400">
        Updates about every {CHUNK_MS / 1000} seconds. The backend transcribes finished audio files, not a live stream.
      </footer>
    </section>
  );
}