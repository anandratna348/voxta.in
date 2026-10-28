import { CalendarClock, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { sessionsApi } from "@/api/services";
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

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-4xl text-indigo-900">{greeting()}, {firstName}</h1>
        <p className="mt-2 text-indigo-500">Start a meeting, or pick up where you left off.</p>
      </header>

      <section className="flex flex-col items-start justify-between gap-6 rounded-xl2 bg-brand-gradient p-8 text-white shadow-lift sm:flex-row sm:items-center">
        <div className="max-w-lg">
          <h2 className="font-display text-2xl">Ready for your next interview?</h2>
          <p className="mt-2 text-sm leading-relaxed text-indigo-100">
            Record the conversation, watch the transcript build, and get suggested answers when a question is detected.
          </p>
        </div>
        <Button variant="light" size="lg" icon={<Plus className="h-5 w-5" />} onClick={() => setDialogOpen(true)}>
          New Meeting
        </Button>
      </section>

      {error && <ErrorState message={error} onRetry={reload} />}

      {!error && (
        <>
          <section aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="text-lg font-semibold text-indigo-900">Recent meetings</h2>
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
              <h2 id="history-heading" className="text-lg font-semibold text-indigo-900">Meeting history</h2>
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