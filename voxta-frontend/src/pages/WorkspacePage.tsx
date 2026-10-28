import { ArrowLeft, Mic, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { sessionsApi, transcriptsApi } from "@/api/services";
import type { SessionStatus } from "@/api/types";
import { toErrorMessage } from "@/api/errors";
import { MeetingRow } from "@/components/meetings/MeetingItems";
import { NewMeetingDialog } from "@/components/meetings/NewMeetingDialog";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/Feedback";
import { StatusPill } from "@/components/ui/StatusPill";
import { RecorderPanel } from "@/components/workspace/RecorderPanel";
import { SessionInfoPanel } from "@/components/workspace/SessionInfoPanel";
import { TranscriptPanel } from "@/components/workspace/TranscriptPanel";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { useAudioDevices } from "@/hooks/useAudioDevices";
import { useRecorder } from "@/hooks/useRecorder";
import { useTranscriptionQueue } from "@/hooks/useTranscriptionQueue";
import { getSavedDeviceId, saveDeviceId } from "@/lib/audio";
import { formatDateTime } from "@/lib/format";
import { loadOffsets } from "@/lib/timeline";

export default function WorkspacePage() {
  const { sessionId } = useParams();
  return sessionId ? <MeetingWorkspace key={sessionId} sessionId={sessionId} /> : <WorkspacePicker />;
}

function WorkspacePicker() {
  const { user } = useAuth();
  const [dialog, setDialog] = useState(false);
  const { data, error, loading, reload } = useAsync((s) => sessionsApi.list(user!.id, 50, s), [user?.id]);
  const open = data?.filter((s) => s.status !== "completed") ?? [];

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-indigo-900">Meeting</h1>
          <p className="mt-2 text-indigo-500">Pick a meeting to record, or start a new one.</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setDialog(true)}>New Meeting</Button>
      </header>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <Skeleton className="h-40" />
      ) : open.length === 0 ? (
        <EmptyState
          icon={<Mic className="h-6 w-6" />}
          title="No open meetings"
          description="Create a meeting to start recording. Completed meetings are in your history."
          action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setDialog(true)}>New Meeting</Button>}
        />
      ) : (
        <div className="divide-y divide-paper-line overflow-hidden rounded-xl2 border border-paper-line bg-paper-raised shadow-card">
          {open.map((s) => <MeetingRow key={s.id} session={s} />)}
        </div>
      )}
      {dialog && <NewMeetingDialog onClose={() => setDialog(false)} />}
    </div>
  );
}

function MeetingWorkspace({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const ownerId = user!.id;

  const sessionQ = useAsync((s) => sessionsApi.get(ownerId, sessionId, s), [ownerId, sessionId]);
  const segQ = useAsync((s) => transcriptsApi.listSegments(ownerId, sessionId, s), [ownerId, sessionId]);

  const [statusOverride, setStatusOverride] = useState<SessionStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deviceId, setDeviceId] = useState<string | undefined>(getSavedDeviceId);
  const { devices, refresh } = useAudioDevices();

  const queue = useTranscriptionQueue({ ownerId, sessionId, onSaved: segQ.reload });
  const recorder = useRecorder({ deviceId, onChunk: queue.enqueue });

  const session = sessionQ.data;
  const status: SessionStatus = statusOverride ?? session?.status ?? "active";
  const offsets = useMemo(() => loadOffsets(sessionId), [sessionId, segQ.data]);

  async function syncStatus(next: SessionStatus) {
    try {
      await sessionsApi.updateStatus(ownerId, sessionId, next);
      setStatusOverride(next);
      setNotice(null);
    } catch (e) {
      setNotice(`The meeting status could not be saved. ${toErrorMessage(e)}`);
    }
  }

  async function handleStart() {
    setBusy(true);
    const ok = await recorder.start();
    if (ok) {
      void refresh();
      if (status !== "active") await syncStatus("active");
    }
    setBusy(false);
  }

  async function handleResume() {
    const ok = await recorder.resume();
    if (ok) await syncStatus("active");
  }

  async function handlePause() {
    await recorder.pause();
    await syncStatus("paused");
  }

  async function handleEnd() {
    setBusy(true);
    await recorder.stop();
    // Uploads keep running in the background. The transcript fills in as they finish.
    await syncStatus("completed");
    setBusy(false);
  }

  if (sessionQ.error) {
    return (
      <div className="space-y-6">
        <BackLink />
        <ErrorState message={sessionQ.error} onRetry={sessionQ.reload} />
      </div>
    );
  }

  const completed = status === "completed";

  return (
    <div className="space-y-8">
      <header>
        <BackLink />
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <h1 className="font-display text-4xl text-indigo-900">{session?.title ?? "Meeting"}</h1>
          <StatusPill status={status} />
        </div>
        <p className="mt-2 text-indigo-500">{session ? `Started ${formatDateTime(session.started_at)}` : "Loading meeting..."}</p>
      </header>

      {notice && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">{notice}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <RecorderPanel
            state={recorder.state}
            mic={recorder.mic}
            level={recorder.level}
            elapsedMs={recorder.elapsedMs}
            error={recorder.error}
            canRecord={!completed && !!session}
            blockedReason={completed ? "This meeting is completed. Create a new meeting to record again." : undefined}
            busy={busy}
            devices={devices}
            deviceId={deviceId}
            onDeviceChange={(id) => {
              setDeviceId(id);
              saveDeviceId(id);
            }}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onEnd={handleEnd}
            pending={queue.pending}
            failedCount={queue.failedCount}
            uploadError={queue.lastError}
            onRetry={queue.retry}
          />
          <TranscriptPanel
            segments={segQ.data}
            offsets={offsets}
            loading={segQ.loading}
            error={segQ.error}
            onRetry={segQ.reload}
            recording={recorder.state === "recording"}
            pending={queue.pending}
          />
        </div>
        <SessionInfoPanel session={session} status={status} segments={segQ.data} elapsedMs={recorder.elapsedMs} />
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-500 hover:text-indigo-800">
      <ArrowLeft className="h-4 w-4" />
      Dashboard
    </Link>
  );
}