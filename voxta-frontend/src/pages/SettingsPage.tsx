import { LogOut, Mic, RefreshCw, Square, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { config } from "@/api/config";
import { Section, Row } from "@/components/settings/Section";
import { Button } from "@/components/ui/Button";
import { FeatureBadge } from "@/components/ui/FeatureBadge";
import { LevelBars } from "@/components/ui/LevelBars";
import { Switch } from "@/components/ui/Switch";
import { useAuth } from "@/context/AuthContext";
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

const AWAITING = [
  "Edit profile details",
  "Set or change the Gemini API key",
  "Delete a meeting",
  "Search inside transcripts",
  "Word by word live transcription",
  "Speaker labels",
  "Capture meeting app audio",
  "Sign in with Google inside the app",
];

export default function SettingsPage() {
  const { user, signIn, signOut } = useAuth();
  const backend = useBackendStatus();
  const { devices, refresh } = useAudioDevices();

  const [name, setName] = useState(user?.name ?? "");
  const [nameSaved, setNameSaved] = useState(false);
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

  if (!user) return null;
  const initial = (user.name || "V").charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-4xl text-indigo-900">Settings</h1>
        <p className="mt-2 text-indigo-500">Your account, audio and application preferences.</p>
      </header>

      <Section title="Account" description="Who you are signed in as.">
        <div className="flex items-center gap-4 py-5">
          {user.picture ? (
            <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lavender-200 text-xl font-bold text-indigo-700">{initial}</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-indigo-900">{user.name || "Local user"}</p>
            <p className="truncate text-sm text-indigo-400">{user.email || "No email on this session"}</p>
          </div>
          <Button variant="secondary" onClick={signOut} icon={<LogOut className="h-4 w-4" />}>Sign out</Button>
        </div>
        <Row label="Sign-in method" hint={user.isDevSession ? "A local test session. It is not authentication." : undefined}>
          <span className="text-sm font-semibold text-indigo-800">{user.isDevSession ? "Development session" : "Google"}</span>
        </Row>
        <Row label="Member since">
          <span className="text-sm font-semibold text-indigo-800">{formatDateTime(user.created_at)}</span>
        </Row>
        {user.isDevSession ? (
          <Row label="Display name" hint="Stored on this computer only.">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                signIn({ ...user, name: name.trim() || "Developer" });
                setNameSaved(true);
                window.setTimeout(() => setNameSaved(false), 1800);
              }}
            >
              <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Display name" className={inputCls} />
              <Button type="submit" variant="secondary">{nameSaved ? "Saved" : "Save"}</Button>
            </form>
          </Row>
        ) : (
          <Row label="Profile details" hint="Name and photo come from your Google account.">
            <FeatureBadge available={false} />
          </Row>
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