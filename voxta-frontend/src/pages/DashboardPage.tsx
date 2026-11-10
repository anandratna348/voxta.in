import { CalendarClock, CheckCircle2, Layers, Plus, Radio } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { sessionsApi } from "@/api/services";
import { Equalizer } from "@/components/brand/Equalizer";
import { MeetingCard, MeetingRow } from "@/components/meetings/MeetingItems";
import { NewMeetingDialog } from "@/components/meetings/NewMeetingDialog";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/Feedback";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Stat({ icon, label, value, loading }: { icon: ReactNode; label: string; value: number; loading: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-xl2 border border-paper-line bg-paper-raised p-5 shadow-card">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</div>
      <div>
        <p className="text-sm text-indigo-500">{label}</p>
        {loading ? <Skeleton className="mt-1 h-7 w-12" /> : <p className="text-2xl font-bold tracking-tight text-indigo-900">{value}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, error, loading, reload } = useAsync(
    (signal) => sessionsApi.list(user!.id, 50, signal),
    [user?.id],
  );

  const firstName = user?.name?.split(" ")[0] || "there";
  const recent = data?.slice(0, 3) ?? [];
  const older = data?.slice(3, 11) ?? [];
  const total = data?.length ?? 0;
  const completed = data?.filter((s) => s.status === "completed").length ?? 0;
  const open = total - completed;
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const thisWeek = data?.filter((s) => new Date(s.started_at).getTime() > weekAgo).length ?? 0;

  return (
    <div className="space-y-9">
      <header>
        <h1 className="font-display text-4xl text-indigo-950">{greeting()}, {firstName}</h1>
        <p className="mt-1.5 text-indigo-500">Start a meeting, or pick up where you left off.</p>
      </header>

      <section className="relative overflow-hidden rounded-xl2 bg-hero-gradient p-9 text-white shadow-lift">
        <Equalizer className="pointer-events-none absolute -right-2 bottom-0 h-full max-h-56 w-56 pr-10 opacity-90" />
        <div className="relative max-w-xl">
          <p className="text-sm font-semibold text-indigo-100">AI interview copilot</p>
          <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-tight">Ready for your next interview?</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-indigo-100">
            Record the conversation, watch the transcript build, and get suggested answers the moment a question is asked.
          </p>
          <Button variant="light" size="lg" className="mt-7" icon={<Plus className="h-5 w-5" />} onClick={() => setDialogOpen(true)}>
            New Meeting
          </Button>
        </div>
      </section>

      {error && <ErrorState message={error} onRetry={reload} />}

      {!error && (
        <>
          <section aria-label="Overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={<Layers className="h-5 w-5" />} label="Total meetings" value={total} loading={loading} />
            <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={completed} loading={loading} />
            <Stat icon={<Radio className="h-5 w-5" />} label="In progress" value={open} loading={loading} />
            <Stat icon={<CalendarClock className="h-5 w-5" />} label="Last 7 days" value={thisWeek} loading={loading} />
          </section>

          <section aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="text-lg font-bold tracking-tight text-indigo-950">Recent meetings</h2>
            <div className="mt-4">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}
                </div>
              ) : recent.length === 0 ? (
                <EmptyState
                  icon={<CalendarClock className="h-6 w-6" />}
                  title="No meetings yet"
                  description="Create your first meeting to start recording and see it appear here."
                  action={<Button onClick={() => setDialogOpen(true)} icon={<Plus className="h-4 w-4" />}>New Meeting</Button>}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {recent.map((s) => <MeetingCard key={s.id} session={s} />)}
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="history-heading">
            <div className="flex items-end justify-between">
              <h2 id="history-heading" className="text-lg font-bold tracking-tight text-indigo-950">Meeting history</h2>
              <Link to="/history" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">View all</Link>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl2 border border-paper-line bg-paper-raised shadow-card">
              {loading ? (
                <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : older.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-indigo-400">Older meetings will appear here.</p>
              ) : (
                <div className="divide-y divide-paper-line">
                  {older.map((s) => <MeetingRow key={s.id} session={s} />)}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {dialogOpen && <NewMeetingDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}