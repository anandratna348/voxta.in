import clsx from "clsx";
import { History } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/Feedback";
import { formatDateTime } from "@/lib/format";
import type { StoredAnswer } from "@/lib/copilotStore";

interface Props {
  answers: StoredAnswer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function AnswerHistory({ answers, selectedId, onSelect }: Props) {
  return (
    <section aria-label="Answer history" className="rounded-xl2 border border-paper-line bg-paper-raised shadow-card">
      <header className="flex items-center justify-between border-b border-paper-line px-6 py-4">
        <h2 className="text-base font-semibold text-indigo-900">Answer history</h2>
        <span className="text-xs text-indigo-400">{answers.length} {answers.length === 1 ? "answer" : "answers"}</span>
      </header>
      <div className="p-3">
        {answers.length === 0 ? (
          <div className="p-3">
            <EmptyState icon={<History className="h-6 w-6" />} title="No answers yet" description="Every answer generated for this meeting is listed here." />
          </div>
        ) : (
          <ul className="space-y-1">
            {answers.map((a) => (
              <li key={a.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(a.id)}
                  onKeyDown={(e) => e.key === "Enter" && onSelect(a.id)}
                  className={clsx("flex cursor-pointer items-start gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-lavender-50", a.id === selectedId && "bg-lavender-100")}
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-indigo-900">
                      {a.source === "backend" ? "Full transcript analysis" : a.question}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-indigo-500">{a.answer}</p>
                    <p className="mt-1 text-xs text-indigo-400">
                      {formatDateTime(a.createdAt)}
                      {a.source === "backend" ? ", saved in meeting history" : ", on this computer"}
                    </p>
                  </div>
                  <CopyButton text={a.answer} compact />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}