import clsx from "clsx";
import { KeyRound, Loader2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { FormattedAnswer } from "@/components/copilot/FormattedAnswer";
import { CopyButton } from "@/components/ui/CopyButton";
import { Switch } from "@/components/ui/Switch";
import type { StoredAnswer } from "@/lib/copilotStore";
import { formatDateTime } from "@/lib/format";

interface Props {
  sessionId: string;
  latest: StoredAnswer | null;
  count: number;
  auto: boolean;
  onAutoChange: (on: boolean) => void;
  listening: boolean;
  analysing: boolean;
  fatal: string | null;
  onDismissFatal: () => void;
}

function Status({ auto, listening, analysing, fatal }: Pick<Props, "auto" | "listening" | "analysing" | "fatal">) {
  let label = "Ready";
  let cls = "bg-lavender-100 text-indigo-600";
  if (fatal) [label, cls] = ["Needs Gemini key", "bg-rose-50 text-rose-700"];
  else if (!auto) [label, cls] = ["Auto detect off", "bg-lavender-100 text-indigo-500"];
  else if (analysing) [label, cls] = ["Analysing", "bg-indigo-50 text-indigo-600"];
  else if (listening) [label, cls] = ["Listening for questions", "bg-sage-50 text-sage-700"];
  return (
    <span className={clsx("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold", cls)}>
      {analysing && !fatal && auto && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {label}
    </span>
  );
}

export function LiveCopilot(p: Props) {
  return (
    <section aria-label="Live copilot" className="overflow-hidden rounded-xl2 border border-lavender-200 bg-paper-raised shadow-lift">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-lavender-50 px-7 py-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <h2 className="text-base font-semibold text-indigo-900">Live copilot</h2>
          <Status auto={p.auto} listening={p.listening} analysing={p.analysing} fatal={p.fatal} />
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold text-indigo-700">
          Auto detect
          <Switch checked={p.auto} onChange={p.onAutoChange} label="Auto detect questions" />
        </label>
      </header>

      {p.fatal && (
        <div role="alert" className="flex gap-3 border-b border-amber-100 bg-amber-50 px-7 py-4 text-sm text-amber-700">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">
            {p.fatal} Save the key once in the backend terminal. Automatic detection is paused until you dismiss this.
          </p>
          <button onClick={p.onDismissFatal} className="self-start font-semibold underline underline-offset-2">Dismiss</button>
        </div>
      )}

      <div className="px-7 py-6">
        {p.latest ? (
          <>
            <div className="mb-4 flex items-start justify-between gap-4">
              <p className="line-clamp-2 text-sm text-indigo-500">
                <span className="font-semibold text-indigo-700">Question: </span>
                {p.latest.question}
              </p>
              <CopyButton text={p.latest.answer} />
            </div>
            <div key={p.latest.id} className="max-h-72 overflow-y-auto pr-1">
              <FormattedAnswer text={p.latest.answer} />
            </div>
            <p className="mt-4 text-xs text-indigo-400">{formatDateTime(p.latest.createdAt)}</p>
          </>
        ) : (
          <p className="py-4 text-center text-sm leading-relaxed text-indigo-500">
            {p.auto
              ? "When the interviewer asks a question, the suggested answer appears here automatically."
              : "Auto detect is off. Switch it on to get answers as questions are spoken."}
          </p>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-paper-line px-7 py-3 text-xs text-indigo-400">
        <span>Detected questions are sent to Gemini through your backend. Review answers before using them.</span>
        <Link to={`/copilot/${p.sessionId}`} className="font-semibold text-indigo-600 hover:text-indigo-800">
          All answers ({p.count})
        </Link>
      </footer>
    </section>
  );
}