import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import type { MeetingSession, SessionStatus, TranscriptSegment } from "@/api/types";
import { FeatureBadge } from "@/components/ui/FeatureBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { CHUNK_MS } from "@/lib/audio";
import { formatDateTime, formatTimestamp } from "@/lib/format";

interface Props {
  session: MeetingSession | null;
  status: SessionStatus;
  segments: TranscriptSegment[] | null;
  elapsedMs: number;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-sm text-indigo-400">{label}</dt>
      <dd className="text-right text-sm font-semibold text-indigo-900">{children}</dd>
    </div>
  );
}

export function SessionInfoPanel({ session, status, segments, elapsedMs }: Props) {
  const words = segments?.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0) ?? 0;
  return (
    <div className="space-y-6">
      <section className="rounded-xl2 border border-paper-line bg-paper-raised p-6 shadow-card">
        <h2 className="text-base font-semibold text-indigo-900">Session</h2>
        <dl className="mt-3 divide-y divide-paper-line">
          <Row label="Status"><StatusPill status={status} /></Row>
          <Row label="Started">{session ? formatDateTime(session.started_at) : "..."}</Row>
          <Row label="Recorded">{formatTimestamp(elapsedMs)}</Row>
          <Row label="Segments">{segments?.length ?? 0}</Row>
          <Row label="Words">{words}</Row>
          <Row label="Audio source">Microphone</Row>
          <Row label="Update interval">{CHUNK_MS / 1000} s</Row>
        </dl>
        <Link
          to={session ? `/copilot/${session.id}` : "/copilot"}
          className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-lavender-100 text-sm font-semibold text-indigo-700 hover:bg-lavender-200"
        >
          <Sparkles className="h-4 w-4" />
          Open AI Copilot
        </Link>
      </section>

      <section className="rounded-xl2 border border-paper-line bg-paper-raised p-6 shadow-card">
        <h2 className="text-base font-semibold text-indigo-900">What works today</h2>
        <ul className="mt-3 space-y-3 text-sm text-indigo-700">
          <li className="flex items-center justify-between gap-3">Microphone recording <FeatureBadge available /></li>
          <li className="flex items-center justify-between gap-3">Timed transcript saving <FeatureBadge available /></li>
          <li className="flex items-center justify-between gap-3">Pause, resume and end <FeatureBadge available /></li>
          <li className="flex items-center justify-between gap-3">Word by word live stream <FeatureBadge available={false} /></li>
          <li className="flex items-center justify-between gap-3">Speaker labels <FeatureBadge available={false} /></li>
          <li className="flex items-center justify-between gap-3">Meeting app audio capture <FeatureBadge available={false} /></li>
        </ul>
      </section>
    </div>
  );
}