import type { ReactNode } from "react";

type Block = { type: "p" | "ul" | "ol" | "code" | "h"; lines: string[] };

type Tone = "default" | "onDark";
const COLORS = {
  default: { body: "text-indigo-800", strong: "text-indigo-900", code: "bg-lavender-100 text-indigo-800", ulMarker: "marker:text-lavender-400", olMarker: "marker:text-indigo-400" },
  onDark: { body: "text-white/90", strong: "text-white", code: "bg-white/15 text-white", ulMarker: "marker:text-white/60", olMarker: "marker:text-white/70" },
} as const;

function inline(text: string, tone: Tone): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className={`font-semibold ${COLORS[tone].strong}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className={`rounded px-1.5 py-0.5 font-mono text-[13px] ${COLORS[tone].code}`}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  let inCode = false;
  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      if (inCode) blocks.push({ type: "code", lines: [] });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (inCode && last) {
      last.lines.push(raw);
      continue;
    }
    if (!line.trim()) {
      blocks.push({ type: "p", lines: [] });
      continue;
    }
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const kind = heading ? "h" : bullet ? "ul" : numbered ? "ol" : "p";
    const text = (heading ?? bullet ?? numbered)?.[1] ?? line;
    if (last && last.type === kind && kind !== "h" && last.lines.length > 0) last.lines.push(text);
    else blocks.push({ type: kind, lines: [text] });
  }
  return blocks.filter((b) => b.lines.length > 0);
}

/** Small, safe renderer for the formatting Gemini commonly returns. Never injects raw HTML. */
export function FormattedAnswer({ text, tone = "default" }: { text: string; tone?: Tone }) {
  return (
    <div className={`space-y-3 text-[15px] leading-relaxed ${COLORS[tone].body}`}>
      {parse(text).map((b, i) => {
        if (b.type === "code") {
          return (
            <pre key={i} className="overflow-x-auto rounded-xl bg-indigo-950 p-4 font-mono text-[13px] leading-relaxed text-indigo-50">
              {b.lines.join("\n")}
            </pre>
          );
        }
        if (b.type === "h") return <p key={i} className={`font-semibold ${COLORS[tone].strong}`}>{inline(b.lines[0], tone)}</p>;
        if (b.type === "ul") {
          return (
            <ul key={i} className={`list-disc space-y-1.5 pl-5 ${COLORS[tone].ulMarker}`}>
              {b.lines.map((l, j) => <li key={j}>{inline(l, tone)}</li>)}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol key={i} className={`list-decimal space-y-1.5 pl-5 marker:font-semibold ${COLORS[tone].olMarker}`}>
              {b.lines.map((l, j) => <li key={j}>{inline(l, tone)}</li>)}
            </ol>
          );
        }
        return <p key={i}>{inline(b.lines.join(" "), tone)}</p>;
      })}
    </div>
  );
}