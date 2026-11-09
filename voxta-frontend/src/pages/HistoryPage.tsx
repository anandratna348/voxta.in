import clsx from "clsx";
import { History, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toErrorMessage } from "@/api/errors";
import { sessionsApi, transcriptsApi } from "@/api/services";
import type { MeetingSession, SessionStatus } from "@/api/types";
import { HistoryRow } from "@/components/history/HistoryRow";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/Feedback";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { formatDateTime } from "@/lib/format";
import { safeFileName, savePdf } from "@/lib/saveFile";

type Filter = "all" | SessionStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "active", label: "In progress" },
  { value: "paused", label: "Paused" },
];
const LIMIT = 50;

export default function HistoryPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync((s) => sessionsApi.list(user!.id, LIMIT, s), [user?.id]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? [])
      .filter((s) => filter === "all" || s.status === filter)
      .filter((s) => !q || s.title.toLowerCase().includes(q) || formatDateTime(s.started_at).toLowerCase().includes(q))
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
  }, [data, query, filter]);

  const count = (f: Filter) => (data ?? []).filter((s) => f === "all" || s.status === f).length;

  async function exportPdf(session: MeetingSession) {
    setExportingId(session.id);
    setMessage(null);
    try {
      const blob = await transcriptsApi.exportPdf(user!.id, session.id);
      const result = await savePdf(blob, safeFileName(session.title, "pdf"));
      if (result === "saved") setMessage({ ok: true, text: `The report for "${session.title}" was saved.` });
    } catch (e) {
      setMessage({ ok: false, text: `The report could not be created. ${toErrorMessage(e)}` });
    } finally {
      setExportingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl text-indigo-900">History</h1>
        <p className="mt-2 text-indigo-500">Find a past meeting, reopen it, or export a PDF report.</p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-300" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or date"
            aria-label="Search meetings"
            className="h-12 w-full rounded-xl border border-paper-line bg-paper-raised pl-11 pr-10 text-sm text-indigo-900 shadow-card placeholder:text-indigo-300 focus:border-lavender-400 focus:outline-none focus:shadow-focus [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-indigo-400 hover:bg-lavender-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div role="tablist" aria-label="Filter by status" className="flex gap-1 rounded-xl bg-lavender-100 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                "rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
                filter === f.value ? "bg-paper-raised text-indigo-800 shadow-card" : "text-indigo-500 hover:text-indigo-800",
              )}
            >
              {f.label} <span className="font-normal text-indigo-400">{data ? count(f.value) : ""}</span>
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p role="status" className={clsx("rounded-xl p-4 text-sm", message.ok ? "bg-sage-50 text-sage-700" : "bg-rose-50 text-rose-700")}>
          {message.text}
        </p>
      )}

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState icon={<History className="h-6 w-6" />} title="No meetings yet" description="Meetings you record will be listed here." />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="No meetings match"
          description="Try a different title or date, or clear the filters."
          action={<Button variant="secondary" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</Button>}
        />
      ) : (
        <ul className="divide-y divide-paper-line overflow-hidden rounded-xl2 border border-paper-line bg-paper-raised shadow-card">
          {rows.map((s) => <HistoryRow key={s.id} session={s} exporting={exportingId === s.id} onExport={exportPdf} />)}
        </ul>
      )}

      <div className="space-y-1 text-xs leading-relaxed text-indigo-400">
        {(data?.length ?? 0) >= LIMIT && <p>Showing your {LIMIT} most recent meetings.</p>}
        <p>Search covers titles and dates. Searching inside transcripts is awaiting backend support.</p>
        <p>
          PDF reports list the transcript with the times the backend stored, and only the answers saved with
          Analyse full transcript on the AI Copilot screen.
        </p>
      </div>
    </div>
  );
}