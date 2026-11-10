import clsx from "clsx";
import { FileText, ScanSearch, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CONTEXT_LIMIT } from "@/lib/copilotStore";

interface SettingsProps {
  auto: boolean;
  onAutoChange: (on: boolean) => void;
  context: string;
  onContextChange: (value: string) => void;
  onCheck: () => void;
  checking: boolean;
}

export function SettingsCard({ auto, onAutoChange, context, onContextChange, onCheck, checking }: SettingsProps) {
  return (
    <section className="rounded-xl2 border border-paper-line bg-paper-raised p-6 shadow-card">
      <h2 className="text-base font-semibold text-indigo-900">Detection</h2>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-indigo-800">Auto detect</p>
          <p className="mt-1 text-xs leading-relaxed text-indigo-400">
            Checks each new transcript line through your backend. Detected questions are sent to Gemini. Earlier lines need the button below.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={auto}
          aria-label="Auto detect questions"
          onClick={() => onAutoChange(!auto)}
          className={clsx("relative h-6 w-11 shrink-0 rounded-full transition-colors", auto ? "bg-brand-gradient" : "bg-lavender-300")}
        >
          <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-card transition-all", auto ? "left-[22px]" : "left-0.5")} />
        </button>
      </div>

      <Button variant="secondary" className="mt-4 w-full" onClick={onCheck} loading={checking} icon={<ScanSearch className="h-4 w-4" />}>
        Check transcript for questions
      </Button>

      <label htmlFor="copilot-context" className="mt-6 block text-sm font-semibold text-indigo-800">Your background (optional)</label>
      <textarea
        id="copilot-context"
        value={context}
        maxLength={CONTEXT_LIMIT}
        onChange={(e) => onContextChange(e.target.value)}
        rows={5}
        placeholder="Role, years of experience, key projects, the job you are applying for."
        className="mt-2 w-full resize-y rounded-xl border border-paper-line bg-paper px-3 py-2.5 text-sm text-indigo-900 placeholder:text-indigo-300 focus:border-lavender-400 focus:outline-none focus:shadow-focus"
      />
      <p className="mt-1 text-xs text-indigo-400">Used for questions about your experience. Kept on this computer. {context.length}/{CONTEXT_LIMIT}</p>
    </section>
  );
}

interface AskProps {
  onAsk: (text: string) => Promise<string | null>;
  onAnalyseAll: () => Promise<string | null>;
}

export function AskCard({ onAsk, onAnalyseAll }: AskProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"ask" | "all" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(kind: "ask" | "all") {
    setBusy(kind);
    setMessage(null);
    const result = kind === "ask" ? await onAsk(text) : await onAnalyseAll();
    if (kind === "ask" && !result) setText("");
    setMessage(result);
    setBusy(null);
  }

  return (
    <section className="rounded-xl2 border border-paper-line bg-paper-raised p-6 shadow-card">
      <h2 className="text-base font-semibold text-indigo-900">Ask a question</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        aria-label="Question"
        placeholder="Type or paste an interview question."
        className="mt-3 w-full resize-y rounded-xl border border-paper-line bg-paper px-3 py-2.5 text-sm text-indigo-900 placeholder:text-indigo-300 focus:border-lavender-400 focus:outline-none focus:shadow-focus"
      />
      <Button className="mt-3 w-full" onClick={() => run("ask")} loading={busy === "ask"} disabled={!text.trim() || busy !== null} icon={<Send className="h-4 w-4" />}>
        Get suggested answer
      </Button>

      <div className="mt-5 border-t border-paper-line pt-5">
        <p className="text-sm font-semibold text-indigo-800">Save to meeting report</p>
        <p className="mt-1 text-xs leading-relaxed text-indigo-400">
          Analyses the whole transcript in one go and saves the result to the meeting history, which PDF reports use.
          The backend reads only the first 4,000 characters.
        </p>
        <Button variant="secondary" className="mt-3 w-full" onClick={() => run("all")} loading={busy === "all"} disabled={busy !== null} icon={<FileText className="h-4 w-4" />}>
          Analyse full transcript
        </Button>
      </div>

      {message && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">{message}</p>}
    </section>
  );
}