import { Ghost, Maximize2, Moon, Sun, Captions, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { logoMark } from "@/assets/brand";
import { FormattedAnswer } from "@/components/copilot/FormattedAnswer";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatTimestamp } from "@/lib/format";
import { EVT, SHORTCUTS, type OverlaySnapshot, type OverlayStatus } from "./types";

type Theme = "dark" | "light";
interface Prefs { opacity: number; theme: Theme; showTranscript: boolean }

const PREFS_KEY = "voxta.overlay.prefs";
const GEOMETRY_KEY = "voxta.overlay.geometry";

function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<Prefs>;
    return {
      opacity: typeof raw.opacity === "number" ? Math.min(1, Math.max(0.3, raw.opacity)) : 0.78,
      theme: raw.theme === "light" ? "light" : "dark",
      showTranscript: raw.showTranscript !== false,
    };
  } catch {
    return { opacity: 0.78, theme: "dark", showTranscript: true };
  }
}

const STATUS: Record<OverlayStatus, { label: string; dot: string }> = {
  ready: { label: "Ready", dot: "#A3A8D9" },
  listening: { label: "Listening", dot: "#3F9D69" },
  paused: { label: "Paused", dot: "#C48A1C" },
  finished: { label: "Finished", dot: "#7955FD" },
};

export function OverlayApp() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [snap, setSnap] = useState<OverlaySnapshot | null>(null);
  const [ghost, setGhost] = useState(false);
  const scroller = useRef<HTMLOListElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  // Live data from the main window.
  useEffect(() => {
    const stops: Array<() => void> = [];
    let cancelled = false;
    (async () => {
      const a = await listen<OverlaySnapshot | null>(EVT.snapshot, (e) => setSnap(e.payload));
      const b = await listen<boolean>(EVT.ghostState, (e) => setGhost(e.payload));
      if (cancelled) { a(); b(); return; }
      stops.push(a, b);
      await emit(EVT.ready);
    })();
    return () => {
      cancelled = true;
      stops.forEach((s) => s());
    };
  }, []);

  // Remember where the overlay was left.
  useEffect(() => {
    const win = getCurrentWebviewWindow();
    let timer: number | undefined;
    const save = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        try {
          const [scale, pos, size] = await Promise.all([win.scaleFactor(), win.outerPosition(), win.outerSize()]);
          localStorage.setItem(GEOMETRY_KEY, JSON.stringify({ x: pos.x / scale, y: pos.y / scale, width: size.width / scale, height: size.height / scale }));
        } catch {
          /* ignore */
        }
      }, 400);
    };
    const stops: Array<() => void> = [];
    void win.onMoved(save).then((s) => stops.push(s));
    void win.onResized(save).then((s) => stops.push(s));
    return () => {
      window.clearTimeout(timer);
      stops.forEach((s) => s());
    };
  }, []);

  const lineCount = snap?.lines.length ?? 0;
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [lineCount, snap?.analysing]);

  const dark = prefs.theme === "dark";
  const fg = dark ? "#FFFFFF" : "#141527";
  const muted = dark ? "rgba(255,255,255,0.68)" : "#535990";
  const line = dark ? "rgba(255,255,255,0.14)" : "rgba(20,21,39,0.12)";
  const background = dark ? `rgba(17,18,40,${prefs.opacity})` : `rgba(255,255,255,${prefs.opacity})`;
  const status = snap ? STATUS[snap.status] : STATUS.ready;
  const iconBtn = "flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/15";

  return (
    <div className="h-full w-full p-1.5">
      <div
        className="flex h-full flex-col overflow-hidden rounded-2xl border"
        style={{ background, borderColor: line, color: fg, textShadow: dark ? "0 1px 2px rgba(0,0,0,0.45)" : "none" }}
      >
        <header data-tauri-drag-region className="flex select-none items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${line}` }}>
          <img src={logoMark} alt="" draggable={false} className="pointer-events-none h-4" />
          <span className="pointer-events-none text-sm font-bold tracking-tight">Voxta</span>
          <span className="pointer-events-none ml-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: muted }}>
            <span className="h-2 w-2 rounded-full" style={{ background: status.dot }} />
            {snap?.analysing ? "Analysing" : status.label}
          </span>
          <div data-tauri-drag-region className="h-6 flex-1" />
          {!ghost && (
            <>
              <input
                type="range"
                min={0.3}
                max={1}
                step={0.05}
                value={prefs.opacity}
                onChange={(e) => setPrefs({ ...prefs, opacity: Number(e.target.value) })}
                aria-label="Transparency"
                title="Transparency"
                className="h-1 w-16 cursor-pointer accent-violet-500"
              />
              <button className={iconBtn} title="Light or dark" aria-label="Switch light or dark" onClick={() => setPrefs({ ...prefs, theme: dark ? "light" : "dark" })}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button className={iconBtn} title="Show or hide transcript" aria-label="Show or hide transcript" onClick={() => setPrefs({ ...prefs, showTranscript: !prefs.showTranscript })} style={{ opacity: prefs.showTranscript ? 1 : 0.5 }}>
                <Captions className="h-4 w-4" />
              </button>
              <button className={iconBtn} title={`Click through (${SHORTCUTS.ghost.label} to turn off)`} aria-label="Click through mode" onClick={() => void emit(EVT.ghostRequest, true)}>
                <Ghost className="h-4 w-4" />
              </button>
              <button className={iconBtn} title="Open Voxta" aria-label="Open Voxta" onClick={() => void emit(EVT.focusMain)}>
                <Maximize2 className="h-4 w-4" />
              </button>
              <button className={iconBtn} title="Close overlay" aria-label="Close overlay" onClick={() => void getCurrentWebviewWindow().close()}>
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </header>

        {ghost && (
          <p role="status" className="px-4 py-1.5 text-xs font-semibold" style={{ background: "rgba(121,85,253,0.35)" }}>
            Click through is on. Press {SHORTCUTS.ghost.label} to turn it off.
          </p>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
          {!snap ? (
            <p className="py-6 text-center text-sm leading-relaxed" style={{ color: muted }}>
              Open a meeting in Voxta and press Start recording. The live transcript and suggested answers appear here.
            </p>
          ) : (
            <>
              <section aria-label="Suggested answer" className={`shrink-0 overflow-y-auto ${prefs.showTranscript ? "max-h-[58%]" : "max-h-full"}`}>
                <h2 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: muted }}>Suggested answer</h2>
                {!snap.copilotEnabled ? (
                  <p className="mt-2 text-sm" style={{ color: muted }}>AI Copilot is not included in your plan.</p>
                ) : snap.answer ? (
                  <div className="mt-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: muted }}>{snap.answer.question}</p>
                      <CopyButton text={snap.answer.answer} compact />
                    </div>
                    <div className="mt-2">
                      <FormattedAnswer text={snap.answer.answer} tone={dark ? "onDark" : "default"} />
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm" style={{ color: muted }}>
                    {snap.autoDetect ? "Waiting for the interviewer to ask a question." : "Auto detect is off. Turn it on in the Meeting screen."}
                  </p>
                )}
              </section>

              {prefs.showTranscript && (
                <section aria-label="Live transcript" className="flex min-h-0 flex-1 flex-col border-t pt-3" style={{ borderColor: line }}>
                  <h2 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: muted }}>Live transcript</h2>
                  {snap.lines.length === 0 ? (
                    <p className="mt-2 text-sm" style={{ color: muted }}>No speech yet.</p>
                  ) : (
                    <ol ref={scroller} className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                      {snap.lines.map((l, i) => (
                        <li key={l.id} className="flex gap-3 text-[13px] leading-relaxed" style={{ opacity: i === snap.lines.length - 1 ? 1 : 0.78 }}>
                          <span className="mt-px w-11 shrink-0 font-mono text-[11px] tabular-nums" style={{ color: muted }}>
                            {l.exact ? "" : "~"}{formatTimestamp(l.timeMs)}
                          </span>
                          <span>{l.text}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}