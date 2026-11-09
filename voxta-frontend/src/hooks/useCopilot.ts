import { useCallback, useEffect, useRef, useState } from "react";
import { toErrorMessage } from "@/api/errors";
import { agentApi } from "@/api/services";
import type { TranscriptSegment } from "@/api/types";
import { isNoQuestion, loadStore, saveStore, type CopilotStore, type StoredAnswer } from "@/lib/copilotStore";

interface Args {
  ownerId: string;
  sessionId: string;
  segments: TranscriptSegment[] | null;
  context: string;
  auto: boolean;
}

export interface AnalyseOutcome {
  ok: boolean;
  message?: string;
}

const MIN_WORDS = 3;
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

function without<T>(map: Record<string, T>, key: string): Record<string, T> {
  const next = { ...map };
  delete next[key];
  return next;
}

/**
 * Sends transcript text through the backend one item at a time. The backend decides whether
 * a piece of text is an interviewer question, so detection is never guessed by the app.
 */
export function useCopilot({ ownerId, sessionId, segments, context, auto }: Args) {
  const [store, setStore] = useState<CopilotStore>(() => loadStore(sessionId));
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState<string | null>(null);
  const [latestAnswerId, setLatestAnswerId] = useState<string | null>(null);

  const storeRef = useRef(store);
  const errorsRef = useRef(errors);
  errorsRef.current = errors;
  const fatalRef = useRef(fatal);
  fatalRef.current = fatal;
  const contextRef = useRef(context);
  contextRef.current = context;
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const queue = useRef<string[]>([]);
  const queued = useRef(new Set<string>());
  const working = useRef(false);
  /** Lines that already existed when the page opened. Auto detect only handles lines that arrive later. */
  const baseline = useRef<Set<string> | null>(null);

  const commit = useCallback(
    (update: (s: CopilotStore) => CopilotStore) => {
      const next = update(storeRef.current);
      storeRef.current = next;
      setStore(next);
      saveStore(sessionId, next);
    },
    [sessionId],
  );

  /** Core call. Records the answer locally when the backend returns one. */
  const analyse = useCallback(
    async (text: string, segmentId?: string): Promise<AnalyseOutcome> => {
      const result = await agentApi.processText(ownerId, text, contextRef.current);

      if (!result.question_detected) {
        const reason = result.reason ?? "No interviewer question detected.";
        if (segmentId) commit((s) => ({ ...s, scans: { ...s.scans, [segmentId]: { state: "none", reason } } }));
        return { ok: false, message: reason };
      }
      if (!result.answer) {
        const reason = result.reason ?? "This question was already processed.";
        if (segmentId) commit((s) => ({ ...s, scans: { ...s.scans, [segmentId]: { state: "question", reason } } }));
        return { ok: false, message: reason };
      }
      if (isNoQuestion(result.answer)) {
        const reason = "The assistant found no interviewer question in this text.";
        if (segmentId) commit((s) => ({ ...s, scans: { ...s.scans, [segmentId]: { state: "none", reason } } }));
        return { ok: false, message: reason };
      }

      const answer: StoredAnswer = {
        id: crypto.randomUUID(),
        question: text,
        answer: result.answer,
        createdAt: new Date().toISOString(),
        source: "app",
        segmentId,
      };
      commit((s) => ({
        answers: [...s.answers, answer],
        scans: segmentId ? { ...s.scans, [segmentId]: { state: "question", answerId: answer.id } } : s.scans,
      }));
      setLatestAnswerId(answer.id);
      return { ok: true };
    },
    [ownerId, commit],
  );

  const pump = useCallback(async () => {
    if (working.current) return;
    working.current = true;
    try {
      while (queue.current.length > 0 && !fatalRef.current) {
        const id = queue.current.shift()!;
        const segment = segmentsRef.current?.find((s) => s.id === id);
        if (!segment) {
          queued.current.delete(id);
          continue;
        }
        setRunning((r) => ({ ...r, [id]: true }));
        try {
          // A question split across two audio parts: join the unfinished line before it.
          const list = segmentsRef.current ?? [];
          const prev = list[list.findIndex((s) => s.id === id) - 1];
          const unfinished = prev && !/[.?!]["')\]]?\s*$/.test(prev.text.trim());
          const joined = unfinished && storeRef.current.scans[prev.id]?.state === "none";
          await analyse(joined ? `${prev.text.trim()} ${segment.text}` : segment.text, id);
          setErrors((e) => without(e, id));
        } catch (error) {
          const message = toErrorMessage(error);
          setErrors((e) => ({ ...e, [id]: message }));
          if (/api key/i.test(message)) {
            setFatal(message);
            queue.current = [];
            queued.current.clear();
          }
        } finally {
          queued.current.delete(id);
          setRunning((r) => without(r, id));
        }
      }
    } finally {
      working.current = false;
    }
  }, [analyse]);

  const enqueue = useCallback(
    (ids: string[]) => {
      for (const id of ids) {
        if (queued.current.has(id) || storeRef.current.scans[id]) continue;
        queued.current.add(id);
        queue.current.push(id);
      }
      void pump();
    },
    [pump],
  );

  const eligible = useCallback(
    () => (segments ?? []).filter((s) => words(s.text) >= MIN_WORDS).map((s) => s.id),
    [segments],
  );

  useEffect(() => {
    if (segments && baseline.current === null) baseline.current = new Set(segments.map((s) => s.id));
  }, [segments]);

  useEffect(() => {
    if (!auto || fatalRef.current) return;
    enqueue(eligible().filter((id) => !errorsRef.current[id] && !baseline.current?.has(id)));
  }, [auto, eligible, enqueue]);

  const checkTranscript = useCallback(() => {
    setErrors({});
    enqueue(eligible());
  }, [eligible, enqueue]);

  const retry = useCallback(
    (id: string) => {
      setErrors((e) => without(e, id));
      setFatal(null);
      fatalRef.current = null;
      enqueue([id]);
    },
    [enqueue],
  );

  /** Ask about one specific piece of text, whether or not it looks like a question. */
  const ask = useCallback(
    async (text: string, segmentId?: string): Promise<AnalyseOutcome> => {
      try {
        setFatal(null);
        if (segmentId) setRunning((r) => ({ ...r, [segmentId]: true }));
        return await analyse(text.trim(), segmentId);
      } catch (error) {
        return { ok: false, message: toErrorMessage(error) };
      } finally {
        if (segmentId) setRunning((r) => without(r, segmentId));
      }
    },
    [analyse],
  );

  return {
    answers: store.answers,
    scans: store.scans,
    running,
    errors,
    fatal,
    dismissFatal: () => setFatal(null),
    latestAnswerId,
    pendingCount: Object.keys(running).length + queue.current.length,
    checkTranscript,
    retry,
    ask,
  };
}