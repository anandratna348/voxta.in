import { ChevronRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import type { MeetingSession } from "@/api/types";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateTime, formatDuration } from "@/lib/format";

export function MeetingCard({ session }: { session: MeetingSession }) {
  const duration = formatDuration(session.started_at, session.ended_at);
  return (
    <Link
      to={`/workspace/${session.id}`}
      className="group flex flex-col rounded-xl2 border border-paper-line bg-paper-raised p-5 shadow-card transition-shadow hover:shadow-lift"
    >
      <StatusPill status={session.status} />
      <h3 className="mt-4 line-clamp-2 text-base font-semibold leading-snug text-indigo-900">{session.title}</h3>
      <p className="mt-1 text-sm text-indigo-400">{formatDateTime(session.started_at)}</p>
      <div className="mt-5 flex items-center justify-between text-sm text-indigo-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {duration ?? (session.status === "completed" ? "Duration unknown" : "Not finished")}
        </span>
        <ChevronRight className="h-4 w-4 text-indigo-300 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export function MeetingRow({ session }: { session: MeetingSession }) {
  const duration = formatDuration(session.started_at, session.ended_at);
  return (
    <Link to={`/workspace/${session.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-lavender-50">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-indigo-900">{session.title}</p>
        <p className="mt-0.5 text-xs text-indigo-400">
          {formatDateTime(session.started_at)}
          {duration ? `, ${duration}` : ""}
        </p>
      </div>
      <StatusPill status={session.status} />
      <ChevronRight className="h-4 w-4 text-indigo-300" />
    </Link>
  );
}