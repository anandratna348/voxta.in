import { FileDown, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { MeetingSession } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateTime, formatDuration } from "@/lib/format";

interface Props {
  session: MeetingSession;
  exporting: boolean;
  onExport: (session: MeetingSession) => void;
}

export function HistoryRow({ session, exporting, onExport }: Props) {
  const duration = formatDuration(session.started_at, session.ended_at);
  const done = session.status === "completed";
  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4 transition-colors hover:bg-lavender-50/60">
      <div className="min-w-[14rem] flex-1">
        <p className="truncate text-[15px] font-semibold text-indigo-900">{session.title}</p>
        <p className="mt-0.5 text-sm text-indigo-400">
          {formatDateTime(session.started_at)}
          {duration ? `, ${duration}` : ""}
        </p>
      </div>
      <StatusPill status={session.status} />
      <div className="flex items-center gap-2">
        <Link
          to={`/workspace/${session.id}`}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-paper-line bg-paper-raised px-4 text-sm font-semibold text-indigo-800 hover:bg-lavender-50"
        >
          <Play className="h-4 w-4" />
          {done ? "Reopen" : "Resume"}
        </Link>
        <Link
          to={`/copilot/${session.id}`}
          aria-label={`Open AI Copilot for ${session.title}`}
          title="AI Copilot"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-indigo-500 hover:bg-lavender-100"
        >
          <Sparkles className="h-4 w-4" />
        </Link>
        <Button variant="secondary" onClick={() => onExport(session)} loading={exporting} icon={<FileDown className="h-4 w-4" />}>
          Export PDF
        </Button>
      </div>
    </li>
  );
}