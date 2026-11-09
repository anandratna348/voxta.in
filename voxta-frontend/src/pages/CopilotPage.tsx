import { ArrowLeft, KeyRound, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toErrorMessage } from "@/api/errors";
import { sessionsApi, transcriptsApi } from "@/api/services";
import { AnswerHero } from "@/components/copilot/AnswerHero";
import { AnswerHistory } from "@/components/copilot/AnswerHistory";
import { AskCard, SettingsCard } from "@/components/copilot/ControlPanels";
import { QuestionList } from "@/components/copilot/QuestionList";
import { MeetingRow } from "@/components/meetings/MeetingItems";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/Feedback";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { useCopilot } from "@/hooks/useCopilot";
import {
  isNoQuestion, loadAuto, loadContext, parseBackendTime, saveAuto, saveContext, type StoredAnswer,
} from "@/lib/copilotStore";
import { loadOffsets } from "@/lib/timeline";

export default function CopilotPage() {
  const { sessionId } = useParams();
  return sessionId ? <CopilotWorkspace key={sessionId} sessionId={sessionId} /> : <CopilotPicker />;
}

function CopilotPicker() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync((s) => sessionsApi.list(user!.id, 50, s), [user?.id]);
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl text-indigo-900">AI Copilot</h1>
        <p className="mt-2 text-indigo-500">Choose a meeting to detect questions and get suggested answers.</p>
      </header>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <Skeleton className="h-40" />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-6 w-6" />} title="No meetings yet" description="Create a meeting from the Dashboard, then come back here." />
      ) : (
        <div className="divide-y divide-paper-line overflow-hidden rounded-xl2 border border-paper-line bg-paper-raised shadow-card">
          {data.map((s) => <MeetingRow key={s.id} session={s} to={`/copilot/${s.id}`} />)}
        </div>
      )}
    </div>
  );
}

function CopilotWorkspace({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const ownerId = user!.id;

  const sessionQ = useAsync((s) => sessionsApi.get(ownerId, sessionId, s), [ownerId, sessionId]);
  const segQ = useAsync((s) => transcriptsApi.listSegments(ownerId, sessionId, s), [ownerId, sessionId]);
  const backendQ = useAsync((s) => transcriptsApi.listAnswers(ownerId, sessionId, s), [ownerId, sessionId]);

  const [context, setContext] = useState(loadContext);
  const [auto, setAuto] = useState(loadAuto);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const copilot = useCopilot({ ownerId, sessionId, segments: segQ.data, context, auto });
  const status = sessionQ.data?.status;

  // Keep the transcript fresh while the meeting is still being recorded elsewhere.
  const reloadSegments = segQ.reload;
  useEffect(() => {
    if (!status || status === "completed") return;
    const id = window.setInterval(() => {
      if (!document.hidden) reloadSegments();
    }, 15000);
    return () => window.clearInterval(id);
  }, [status, reloadSegments]);

  useEffect(() => {
    if (copilot.latestAnswerId) setSelectedId(copilot.latestAnswerId);
  }, [copilot.latestAnswerId]);

  const answers: StoredAnswer[] = useMemo(() => {
    const fromBackend: StoredAnswer[] = (backendQ.data ?? [])
      .filter((a) => !isNoQuestion(a.answer_text))
      .map((a) => ({
        id: a.id,
        question: a.question_text,
        answer: a.answer_text,
        createdAt: parseBackendTime(a.created_at),
        source: "backend" as const,
      }));
    return [...copilot.answers, ...fromBackend].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [copilot.answers, backendQ.data]);

  const selected = answers.find((a) => a.id === selectedId) ?? answers[0] ?? null;
  const offsets = useMemo(() => loadOffsets(sessionId), [sessionId, segQ.data]);
  const segments = segQ.data ?? [];

  async function ask(text: string): Promise<string | null> {
    const outcome = await copilot.ask(text);
    return outcome.ok ? null : outcome.message ?? "No answer was returned.";
  }

  async function analyseAll(): Promise<string | null> {
    try {
      const result = await transcriptsApi.process(ownerId, sessionId, context);
      if (!result.answer) return result.reason ?? "The backend returned no answer.";
      if (isNoQuestion(result.answer)) return "The assistant found no interviewer question in the transcript.";
      backendQ.reload();
      return "Saved to the meeting history. It is included in PDF reports.";
    } catch (e) {
      return toErrorMessage(e);
    }
  }

  if (sessionQ.error) {
    return (
      <div className="space-y-6">
        <BackLink />
        <ErrorState message={sessionQ.error} onRetry={sessionQ.reload} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <BackLink />
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <h1 className="font-display text-4xl text-indigo-900">AI Copilot</h1>
          {status && <StatusPill status={status} />}
        </div>
        <p className="mt-2 text-indigo-500">{sessionQ.data?.title ?? "Loading meeting..."}</p>
      </header>

      {copilot.fatal && (
        <div role="alert" className="flex gap-4 rounded-xl2 border border-amber-100 bg-amber-50 p-5 text-sm text-amber-700">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{copilot.fatal}</p>
            <p className="mt-1 leading-relaxed">
              The backend reads your Gemini key from the Windows credential store, and it has no screen or route to set it yet.
              Save it once in the backend terminal, then try again. Automatic checking is paused until then.
            </p>
          </div>
          <button onClick={copilot.dismissFatal} className="self-start font-semibold underline underline-offset-2">Dismiss</button>
        </div>
      )}

      {segQ.error && <ErrorState message={segQ.error} onRetry={segQ.reload} />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <AnswerHero answer={selected} auto={auto} />
          <QuestionList
            segments={segments}
            offsets={offsets}
            scans={copilot.scans}
            running={copilot.running}
            errors={copilot.errors}
            selectedAnswerId={selected?.id ?? null}
            onSelect={setSelectedId}
            onRetry={copilot.retry}
          />
          <AnswerHistory answers={answers} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
        </div>
        <div className="space-y-6">
          <SettingsCard
            auto={auto}
            onAutoChange={(on) => { setAuto(on); saveAuto(on); }}
            context={context}
            onContextChange={(v) => { setContext(v); saveContext(v); }}
            onCheck={copilot.checkTranscript}
            checking={copilot.pendingCount > 0}
          />
          <AskCard onAsk={ask} onAnalyseAll={analyseAll} />
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/copilot" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-500 hover:text-indigo-800">
      <ArrowLeft className="h-4 w-4" />
      All meetings
    </Link>
  );
}