import { useCallback, useRef, useState } from "react";
import { toErrorMessage } from "@/api/errors";
import { transcriptionApi } from "@/api/services";
import { saveOffsets } from "@/lib/timeline";

interface Job {
  id: number;
  blob: Blob;
  offsetMs: number;
}

interface Options {
  ownerId: string;
  sessionId: string;
  onSaved: () => void;
}

/** Uploads audio parts one at a time so transcript order always matches recording order. */
export function useTranscriptionQueue({ ownerId, sessionId, onSaved }: Options) {
  const [pending, setPending] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const failed = useRef<Job[]>([]);
  const counter = useRef(0);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const submit = useCallback(
    (job: Job) => {
      setPending((p) => p + 1);
      chain.current = chain.current.then(async () => {
        try {
          const result = await transcriptionApi.transcribeIntoSession(ownerId, sessionId, job.blob, `part-${job.id}.webm`);
          saveOffsets(sessionId, Object.fromEntries(result.segments.map((s) => [s.id, job.offsetMs])));
          setLastError(null);
          onSavedRef.current();
        } catch (error) {
          failed.current.push(job);
          setFailedCount(failed.current.length);
          setLastError(toErrorMessage(error));
        } finally {
          setPending((p) => p - 1);
        }
      });
    },
    [ownerId, sessionId],
  );

  const enqueue = useCallback(
    (blob: Blob, offsetMs: number) => submit({ id: ++counter.current, blob, offsetMs }),
    [submit],
  );

  const retry = useCallback(() => {
    const jobs = failed.current;
    failed.current = [];
    setFailedCount(0);
    jobs.forEach(submit);
  }, [submit]);

  /** Resolves when every queued upload has finished. */
  const idle = useCallback(() => chain.current, []);

  return { pending, failedCount, lastError, enqueue, retry, idle };
}