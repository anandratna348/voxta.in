import type { ReactNode } from "react";

type Block = { type: "p" | "ul" | "ol" | "code" | "h"; lines: string[] };

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-indigo-900">{part.slice(2, -2)}</strong>;
    }
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="rounded bg-lavender-100 px-1.5 py-0.5 font-mono text-[13px] text-indigo-800">{part.slice(1, -1)}</code>;
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
export function FormattedAnswer({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-indigo-800">
      {parse(text).map((b, i) => {
        if (b.type === "code") {
          return (
            <pre key={i} className="overflow-x-auto rounded-xl bg-indigo-950 p-4 font-mono text-[13px] leading-relaxed text-indigo-50">
              {b.lines.join("\n")}
            </pre>
          );
        }
        if (b.type === "h") return <p key={i} className="font-semibold text-indigo-900">{inline(b.lines[0])}</p>;
        if (b.type === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-lavender-400">
              {b.lines.map((l, j) => <li key={j}>{inline(l)}</li>)}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol key={i} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-indigo-400">
              {b.lines.map((l, j) => <li key={j}>{inline(l)}</li>)}
            </ol>
          );
        }
        return <p key={i}>{inline(b.lines.join(" "))}</p>;
      })}
    </div>
  );
}