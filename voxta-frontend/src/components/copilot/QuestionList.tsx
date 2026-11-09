import clsx from "clsx";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import type { TranscriptSegment } from "@/api/types";
import { EmptyState } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import type { ScanEntry } from "@/lib/copilotStore";
import { formatTimestamp } from "@/lib/format";
import { displayTime, type OffsetMap } from "@/lib/timeline";

interface Props {
  segments: TranscriptSegment[];
  offsets: OffsetMap;
  scans: Record<string, ScanEntry>;
  running: Record<string, boolean>;
  errors: Record<string, string>;
  selectedAnswerId: string | null;
  onSelect: (answerId: string) => void;
  onRetry: (segmentId: string) => void;
}

export function QuestionList({ segments, offsets, scans, running, errors, selectedAnswerId, onSelect, onRetry }: Props) {
  const checked = segments.filter((s) => scans[s.id]).length;
  const items = segments
    .filter((s) => scans[s.id]?.state === "question" || running[s.id] || errors[s.id])
    .sort((a, b) => b.sequence_number - a.sequence_number);
  const found = segments.filter((s) => scans[s.id]?.state === "question").length;

  return (
    <section aria-label="Detected questions" className="rounded-xl2 border border-paper-line bg-paper-raised shadow-card">
      <header className="flex items-center justify-between border-b border-paper-line px-6 py-4">
        <h2 className="text-base font-semibold text-indigo-900">Detected questions</h2>
        <span className="text-xs text-indigo-400">{found} found, {checked} of {segments.length} segments checked</span>
      </header>
      <div className="p-3">
        {items.length === 0 ? (
          <div className="p-3">
            <EmptyState
              icon={<AlertTriangle className="h-6 w-6" />}
              title="No questions detected yet"
              description="Questions appear here once the transcript has been checked."
            />
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((s) => {
              const scan = scans[s.id];
              const t = displayTime(s, offsets);
              const answerId = scan?.answerId;
              const selected = !!answerId && answerId === selectedAnswerId;
              return (
                <li key={s.id}>
                  <div
                    role={answerId ? "button" : undefined}
                    tabIndex={answerId ? 0 : undefined}
                    onClick={() => answerId && onSelect(answerId)}
                    onKeyDown={(e) => e.key === "Enter" && answerId && onSelect(answerId)}
                    className={clsx(
                      "flex items-start gap-4 rounded-xl px-4 py-3 transition-colors",
                      answerId && "cursor-pointer hover:bg-lavender-50",
                      selected && "bg-lavender-100",
                    )}
                  >
                    <span className="mt-0.5 w-14 shrink-0 font-mono text-xs tabular-nums text-indigo-400">
                      {t.exact ? "" : "~"}{formatTimestamp(t.ms)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] leading-relaxed text-indigo-900">{s.text}</p>
                      {errors[s.id] && <p className="mt-1 text-xs text-rose-700">{errors[s.id]}</p>}
                      {scan && !answerId && scan.reason && !errors[s.id] && <p className="mt-1 text-xs text-indigo-400">{scan.reason}</p>}
                    </div>
                    <div className="shrink-0">
                      {running[s.id] ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Answering
                        </span>
                      ) : errors[s.id] ? (
                        <Button variant="secondary" onClick={(e) => { e.stopPropagation(); onRetry(s.id); }} icon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
                      ) : answerId ? (
                        <span className="rounded-full bg-sage-50 px-2.5 py-1 text-xs font-semibold text-sage-700">Answer ready</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">No new answer</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}