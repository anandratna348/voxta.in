import clsx from "clsx";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { copyText } from "@/lib/clipboard";

interface Props {
  text: string;
  label?: string;
  compact?: boolean;
}

export function CopyButton({ text, label = "Copy answer", compact }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const id = window.setTimeout(() => setState("idle"), 1800);
    return () => window.clearTimeout(id);
  }, [state]);

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        setState((await copyText(text)) ? "copied" : "failed");
      }}
      aria-label={label}
      title={label}
      className={clsx(
        "inline-flex items-center gap-2 rounded-xl font-semibold transition-colors",
        compact ? "h-8 px-2.5 text-xs" : "h-10 px-4 text-sm",
        state === "copied" ? "bg-sage-50 text-sage-700" : "bg-lavender-100 text-indigo-700 hover:bg-lavender-200",
      )}
    >
      {state === "copied" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : compact ? "Copy" : label}
    </button>
  );
}