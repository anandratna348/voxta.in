import clsx from "clsx";
import { AlertTriangle, Mic, Pause, Play, RefreshCw, Square } from "lucide-react";
import { useEffect, useState } from "react";
import type { MicState, RecorderState } from "@/hooks/useRecorder";
import { Button } from "@/components/ui/Button";
import { formatTimestamp } from "@/lib/format";

const BARS = Array.from({ length: 36 }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 0.65)));

function LevelMeter({ level, active }: { level: number; active: boolean }) {
  return (
    <div className="flex h-14 items-center gap-[3px]" aria-hidden>
      {BARS.map((shape, i) => (
        <span
          key={i}
          className={clsx("w-1 rounded-full transition-[height] duration-150", active ? "bg-indigo-400" : "bg-lavender-200")}
          style={{ height: `${Math.max(8, active ? level * 100 * shape : 8)}%` }}
        />
      ))}
    </div>
  );
}

function MicChip({ mic, state }: { mic: MicState; state: RecorderState }) {
  let label = "Ready";
  let cls = "bg-lavender-100 text-indigo-600";
  let dot = "bg-lavender-400";
  if (mic === "denied") [label, cls, dot] = ["Microphone blocked", "bg-rose-50 text-rose-700", "bg-rose-500"];
  else if (mic === "unavailable") [label, cls, dot] = ["No microphone", "bg-rose-50 text-rose-700", "bg-rose-500"];
  else if (mic === "error") [label, cls, dot] = ["Microphone error", "bg-rose-50 text-rose-700", "bg-rose-500"];
  else if (state === "recording") [label, cls, dot] = ["Listening", "bg-sage-50 text-sage-700", "bg-sage-500 animate-pulse"];
  else if (state === "paused") [label, cls, dot] = ["Paused", "bg-amber-50 text-amber-700", "bg-amber-500"];
  else if (state === "stopped") [label, cls, dot] = ["Finished", "bg-indigo-50 text-indigo-600", "bg-indigo-400"];
  return (
    <span className={clsx("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold", cls)}>
      <span className={clsx("h-2 w-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

interface Props {
  state: RecorderState;
  mic: MicState;
  level: number;
  elapsedMs: number;
  error: string | null;
  canRecord: boolean;
  blockedReason?: string;
  busy: boolean;
  devices: MediaDeviceInfo[];
  deviceId?: string;
  onDeviceChange: (id: string | undefined) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  pending: number;
  failedCount: number;
  uploadError: string | null;
  onRetry: () => void;
}

export function RecorderPanel(p: Props) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  useEffect(() => {
    if (!confirmEnd) return;
    const id = window.setTimeout(() => setConfirmEnd(false), 5000);
    return () => window.clearTimeout(id);
  }, [confirmEnd]);

  const live = p.state === "recording";
  const started = p.state === "recording" || p.state === "paused";

  return (
    <section className="rounded-xl2 border border-paper-line bg-paper-raised p-7 shadow-card" aria-label="Recording controls">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-indigo-500">Recording time</p>
          <p className="mt-1 font-display text-5xl tabular-nums text-indigo-900">{formatTimestamp(p.elapsedMs)}</p>
        </div>
        <MicChip mic={p.mic} state={p.state} />
      </div>

      <div className="mt-6 rounded-xl bg-lavender-50 px-5 py-3">
        <LevelMeter level={p.level} active={live} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!started && (
          <Button size="lg" onClick={p.onStart} disabled={!p.canRecord || p.busy} loading={p.busy} icon={<Mic className="h-5 w-5" />}>
            Start recording
          </Button>
        )}
        {live && (
          <Button size="lg" variant="secondary" onClick={p.onPause} icon={<Pause className="h-5 w-5" />}>
            Pause
          </Button>
        )}
        {p.state === "paused" && (
          <Button size="lg" onClick={p.onResume} icon={<Play className="h-5 w-5" />}>
            Resume
          </Button>
        )}
        {(started || p.state === "idle") && p.canRecord && (
          confirmEnd ? (
            <>
              <Button size="lg" variant="secondary" className="!border-rose-100 !bg-rose-50 !text-rose-700" onClick={p.onEnd} loading={p.busy}>
                Confirm end meeting
              </Button>
              <Button size="lg" variant="ghost" onClick={() => setConfirmEnd(false)}>Cancel</Button>
            </>
          ) : (
            <Button size="lg" variant="secondary" onClick={() => setConfirmEnd(true)} disabled={p.busy} icon={<Square className="h-4 w-4" />}>
              End meeting
            </Button>
          )
        )}
      </div>

      {!p.canRecord && p.blockedReason && <p className="mt-4 text-sm text-indigo-500">{p.blockedReason}</p>}

      <div className="mt-6 border-t border-paper-line pt-5">
        <label htmlFor="mic-device" className="text-sm font-semibold text-indigo-800">Microphone</label>
        <select
          id="mic-device"
          value={p.deviceId ?? ""}
          disabled={started}
          onChange={(e) => p.onDeviceChange(e.target.value || undefined)}
          className="mt-2 h-11 w-full rounded-xl border border-paper-line bg-paper px-3 text-sm text-indigo-900 focus:border-lavender-400 focus:outline-none focus:shadow-focus disabled:opacity-60"
        >
          <option value="">System default</option>
          {p.devices.map((d, i) => (
            <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>
          ))}
        </select>
        <p className="mt-2 text-xs text-indigo-400">Records your microphone only. Names appear after you allow access once.</p>
      </div>

      {p.error && (
        <div role="alert" className="mt-4 flex gap-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{p.error}</p>
        </div>
      )}

      {p.failedCount > 0 && (
        <div role="alert" className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="flex-1">
            {p.failedCount} recorded {p.failedCount === 1 ? "part" : "parts"} could not be transcribed.
            {p.uploadError ? ` ${p.uploadError}` : ""}
          </p>
          <Button size="md" variant="secondary" onClick={p.onRetry} icon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
        </div>
      )}
    </section>
  );
}