import { Mic, RefreshCw, Square, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { config } from "@/api/config";
import { Section, Row } from "@/components/settings/Section";
import { Button } from "@/components/ui/Button";
import { FeatureBadge } from "@/components/ui/FeatureBadge";
import { LevelBars } from "@/components/ui/LevelBars";
import { Switch } from "@/components/ui/Switch";
import { isTauri } from "@/api/config";
import { closeOverlay, openOverlay } from "@/overlay/controller";
import { useOverlayState } from "@/overlay/useOverlay";
import { SHORTCUTS } from "@/overlay/types";
import { useLicense } from "@/license/LicenseContext";
import { useAudioDevices } from "@/hooks/useAudioDevices";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { useMicTest } from "@/hooks/useMicTest";
import { CHUNK_MS, getCaptureSpeakers, getSavedDeviceId, saveCaptureSpeakers, saveDeviceId } from "@/lib/audio";
import { loadAuto, saveAuto } from "@/lib/copilotStore";
import { formatDateTime } from "@/lib/format";
import { clearLocalMeetingData, countLocalMeetingData } from "@/lib/localData";

const stateLabel = { checking: "Checking", online: "Connected", busy: "Busy", offline: "Offline" } as const;
const stateDot = { checking: "bg-amber-500", online: "bg-sage-500", busy: "bg-amber-500", offline: "bg-rose-500" } as const;
const inputCls =
  "h-11 w-64 max-w-full rounded-xl border border-paper-line bg-paper px-3 text-sm text-indigo-900 focus:border-lavender-400 focus:outline-none focus:shadow-focus";

const FEATURE_LABELS: Record<string, string> = {
  meetings: "Meetings",
  ai_copilot: "AI Copilot",
  pdf_export: "PDF export",
};

const AWAITING = [
  "License checks inside the local backend",
  "Set or change the Gemini API key",
  "Delete a meeting",
  "Search inside transcripts",
  "Word by word live transcription",
  "Speaker labels",
  "Capture meeting app audio",
];

export default function SettingsPage() {
  const license = useLicense();
  const overlay = useOverlayState();
  const { entitlement } = license;
  const backend = useBackendStatus();
  const { devices, refresh } = useAudioDevices();

  const [checking, setChecking] = useState(false);
  const [checkNote, setCheckNote] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | undefined>(getSavedDeviceId);
  const [speakers, setSpeakers] = useState(getCaptureSpeakers);
  const [auto, setAuto] = useState(loadAuto);
  const [localCount, setLocalCount] = useState(countLocalMeetingData);
  const [confirmClear, setConfirmClear] = useState(false);
  const test = useMicTest(deviceId);

  useEffect(() => {
    if (!confirmClear) return;
    const id = window.setTimeout(() => setConfirmClear(false), 5000);
    return () => window.clearTimeout(id);
  }, [confirmClear]);

  useEffect(() => {
    if (test.active) void refresh();
  }, [test.active, refresh]);

  useEffect(() => {
    if (!confirmDeactivate) return;
    const id = window.setTimeout(() => setConfirmDeactivate(false), 6000);
    return () => window.clearTimeout(id);
  }, [confirmDeactivate]);

  if (!entitlement) return null;
  const when = (seconds: number) => formatDateTime(new Date(seconds * 1000).toISOString());

  async function checkNow() {
    setChecking(true);
    setCheckNote(null);
    await license.refresh();
    setCheckNote("Checked just now.");
    setChecking(false);
  }

  async function deactivate(localOnly = false) {
    setDeactivating(true);
    setDeactivateError(null);
    try {
      await license.deactivate({ localOnly });
    } catch (e) {
      setDeactivateError(e instanceof Error ? e.message : "Deactivation failed.");
      setDeactivating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-4xl text-indigo-900">Settings</h1>
        <p className="mt-2 text-indigo-500">Your license, audio and application preferences.</p>
      </header>

      <Section title="License" description="Your plan and how this computer is activated.">
        <Row label="Plan" hint={license.warning ?? undefined}>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-900">
            {entitlement.plan_name || entitlement.plan}
            <span className="rounded-full bg-sage-50 px-2.5 py-1 text-xs font-semibold text-sage-700">Active</span>
          </span>
        </Row>
        <Row label="Licensed to">
          <span className="text-sm font-semibold text-indigo-800">{entitlement.holder || "Not provided"}</span>
        </Row>
        <Row label="License valid until">
          <span className="text-sm font-semibold text-indigo-800">{entitlement.license_expires ? when(entitlement.license_expires) : "No end date"}</span>
        </Row>
        <Row label="Works offline until" hint="Voxta checks your license online regularly and renews this date.">
          <span className="text-sm font-semibold text-indigo-800">{when(entitlement.exp)}</span>
        </Row>
        <Row label="Last online check">
          <span className="text-sm font-semibold text-indigo-800">{license.lastCheckedAt ? formatDateTime(new Date(license.lastCheckedAt).toISOString()) : "Not yet"}</span>
        </Row>
        <Row label="This computer">
          <span className="font-mono text-sm font-semibold text-indigo-800">{entitlement.device.slice(0, 8)}</span>
        </Row>
        <div className="py-5">
          <p className="text-sm font-semibold text-indigo-800">Included features</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {entitlement.features.map((f) => (
              <span key={f} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{FEATURE_LABELS[f] ?? f}</span>
            ))}
          </div>
        </div>
        <Row label="Check license now" hint={checkNote ?? "Contacts the license server and renews your offline access."}>
          <Button variant="secondary" loading={checking} onClick={checkNow} icon={<RefreshCw className="h-4 w-4" />}>Check now</Button>
        </Row>
        <Row label="Deactivate this computer" hint="Frees an activation so you can use the license elsewhere. Voxta locks until you activate again.">
          {confirmDeactivate ? (
            <div className="flex gap-2">
              <Button variant="secondary" className="!border-rose-100 !bg-rose-50 !text-rose-700" loading={deactivating} onClick={() => void deactivate()}>
                Confirm deactivate
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDeactivate(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmDeactivate(true)}>Deactivate</Button>
          )}
        </Row>
        {deactivateError && (
          <div role="alert" className="py-4 text-sm text-rose-700">
            <p>{deactivateError}</p>
            <button onClick={() => void deactivate(true)} className="mt-2 font-semibold underline underline-offset-2">
              Remove from this computer only
            </button>
            <p className="mt-1 text-xs text-rose-700/80">This does not free the activation on the server.</p>
          </div>
        )}
      </Section>

      <Section title="Audio" description="Used for every new recording.">
        <Row label="Microphone" hint="Names appear after you allow access once.">
          <select
            value={deviceId ?? ""}
            onChange={(e) => {
              const id = e.target.value || undefined;
              setDeviceId(id);
              saveDeviceId(id);
            }}
            aria-label="Microphone"
            className={inputCls}
          >
            <option value="">System default</option>
            {devices.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}
          </select>
        </Row>
        <Row label="Pick up speaker audio" hint="Turns off echo cancellation so an interviewer heard through your speakers reaches the transcript. Headphones will hide them.">
          <Switch checked={speakers} onChange={(on) => { setSpeakers(on); saveCaptureSpeakers(on); }} label="Pick up speaker audio" />
        </Row>
        <div className="py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-indigo-800">Test microphone</p>
              <p className="mt-1 text-xs text-indigo-400">Speak and watch the bars. Nothing is recorded or uploaded.</p>
            </div>
            {test.active ? (
              <Button variant="secondary" onClick={test.stop} icon={<Square className="h-4 w-4" />}>Stop test</Button>
            ) : (
              <Button variant="secondary" onClick={() => void test.start()} icon={<Mic className="h-4 w-4" />}>Start test</Button>
            )}
          </div>
          <div className="mt-4 rounded-xl bg-lavender-50 px-5 py-3"><LevelBars level={test.level} active={test.active} /></div>
          {test.error && <p role="alert" className="mt-3 text-sm text-rose-700">{test.error}</p>}
        </div>
        <Row label="Audio part length" hint="Audio is recorded and sent for transcription in parts. This is fixed by the app.">
          <span className="text-sm font-semibold text-indigo-800">{CHUNK_MS / 1000} seconds</span>
        </Row>
      </Section>

      <Section title="Overlay" description="A see-through window that stays on top of your meeting app or browser.">
        <Row label="Floating overlay" hint="Shows the live transcript and suggested answers while you keep the other app visible. Drag it anywhere, resize it, and set how transparent it is.">
          {isTauri ? (
            <Button variant="secondary" onClick={() => void (overlay.open ? closeOverlay() : openOverlay())}>
              {overlay.open ? "Close overlay" : "Open overlay"}
            </Button>
          ) : (
            <span className="text-sm text-indigo-400">Available in the desktop app</span>
          )}
        </Row>
        <Row label="Show or hide" hint="Works even while another app is in front.">
          <kbd className="rounded-lg border border-paper-line bg-paper px-2.5 py-1 font-mono text-xs font-semibold text-indigo-800">{SHORTCUTS.toggle.label}</kbd>
        </Row>
        <Row label="Click through" hint="Mouse clicks pass through the overlay to the app underneath. Press the shortcut again to get the overlay back.">
          <kbd className="rounded-lg border border-paper-line bg-paper px-2.5 py-1 font-mono text-xs font-semibold text-indigo-800">{SHORTCUTS.ghost.label}</kbd>
        </Row>
        {overlay.shortcuts === "failed" && (
          <p role="alert" className="py-4 text-sm text-amber-700">The shortcuts could not be registered, probably because another app already uses them. The overlay still works with its buttons.</p>
        )}
        {overlay.error && <p role="alert" className="py-4 text-sm text-rose-700">{overlay.error}</p>}
      </Section>

      <Section title="Application" description="Connection, copilot and local data.">
        <Row label="Backend connection" hint={`Set VITE_API_BASE_URL in the .env file and restart to change the address. Now: ${config.displayBackendUrl}`}>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-800">
              <span className={`h-2 w-2 rounded-full ${stateDot[backend.state]}`} />
              {stateLabel[backend.state]}
            </span>
            <Button variant="secondary" onClick={backend.recheck} icon={<RefreshCw className="h-4 w-4" />}>Check</Button>
          </div>
        </Row>
        <Row label="Auto detect questions" hint="New transcript lines are checked and answered automatically. Detected questions are sent to Gemini through your backend.">
          <Switch checked={auto} onChange={(on) => { setAuto(on); saveAuto(on); }} label="Auto detect questions" />
        </Row>
        <Row label="Saved meeting data" hint="Copilot answers and recording times kept on this computer. Meetings and transcripts in the backend are not affected.">
          {confirmClear ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="!border-rose-100 !bg-rose-50 !text-rose-700"
                onClick={() => { clearLocalMeetingData(); setLocalCount(countLocalMeetingData()); setConfirmClear(false); }}
              >
                Confirm clear
              </Button>
              <Button variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="secondary" disabled={localCount === 0} onClick={() => setConfirmClear(true)} icon={<Trash2 className="h-4 w-4" />}>
              {localCount === 0 ? "Nothing to clear" : `Clear ${localCount} ${localCount === 1 ? "item" : "items"}`}
            </Button>
          )}
        </Row>
      </Section>

      <Section title="Awaiting backend support" description="These need a backend change before the app can offer them.">
        <ul className="divide-y divide-paper-line">
          {AWAITING.map((item) => (
            <li key={item} className="flex items-center justify-between gap-4 py-3.5 text-sm text-indigo-700">
              {item}
              <FeatureBadge available={false} />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}