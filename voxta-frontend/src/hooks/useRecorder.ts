import { useCallback, useEffect, useRef, useState } from "react";
import { CHUNK_MS, MIN_CHUNK_MS, pickMimeType } from "@/lib/audio";

export type RecorderState = "idle" | "recording" | "paused" | "stopped";
export type MicState = "unknown" | "ready" | "denied" | "unavailable" | "error";

interface Options {
  deviceId?: string;
  /** Called with each finished audio part and where it began on the recording clock. */
  onChunk: (blob: Blob, offsetMs: number) => void;
}

/**
 * Records the microphone as a series of complete webm files. Each part is a
 * standalone file because the backend decodes every upload on its own.
 */
export function useRecorder({ deviceId, onChunk }: Options) {
  const [state, setStateValue] = useState<RecorderState>("idle");
  const [mic, setMic] = useState<MicState>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);

  const stateRef = useRef<RecorderState>("idle");
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkTimer = useRef<number | undefined>(undefined);
  const tickTimer = useRef<number | undefined>(undefined);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const recordedMs = useRef(0);
  const partStartedAt = useRef(0);
  const onChunkRef = useRef(onChunk);
  onChunkRef.current = onChunk;

  const setState = useCallback((next: RecorderState) => {
    stateRef.current = next;
    setStateValue(next);
  }, []);

  const releaseStream = useCallback(() => {
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
    void ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLevel(0);
  }, []);

  const attachMeter = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    ctxRef.current = ctx;
    const data = new Uint8Array(analyser.fftSize);
    let last = 0;
    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (t - last < 60) return;
      last = t;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3.2));
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const acquire = useCallback(async (): Promise<MediaStream | null> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMic("unavailable");
      setError("Microphone recording is not supported in this window.");
      return null;
    }
    const attempt = (id?: string) =>
      navigator.mediaDevices.getUserMedia({
        audio: { deviceId: id ? { exact: id } : undefined, echoCancellation: true, noiseSuppression: true },
      });
    try {
      let stream: MediaStream;
      try {
        stream = await attempt(deviceId);
      } catch (e) {
        if (deviceId && e instanceof DOMException && e.name === "OverconstrainedError") stream = await attempt();
        else throw e;
      }
      streamRef.current = stream;
      attachMeter(stream);
      setMic("ready");
      setError(null);
      return stream;
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setMic("denied");
        setError("Microphone access is blocked. Allow it in Windows Settings under Privacy and security, Microphone.");
      } else if (name === "NotFoundError") {
        setMic("unavailable");
        setError("No microphone was found. Connect one and try again.");
      } else {
        setMic("error");
        setError("The microphone could not be started.");
      }
      return null;
    }
  }, [deviceId, attachMeter]);

  const beginPart = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const parts: Blob[] = [];
    const startedAt = performance.now();
    const offset = recordedMs.current;
    partStartedAt.current = startedAt;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) parts.push(e.data);
    };
    recorder.onstop = () => {
      const duration = performance.now() - startedAt;
      recordedMs.current = offset + duration;
      partStartedAt.current = 0;
      if (duration >= MIN_CHUNK_MS && parts.length > 0) {
        onChunkRef.current(new Blob(parts, { type: recorder.mimeType || "audio/webm" }), offset);
      }
      if (stateRef.current === "recording") beginPart();
    };
    recorder.start();
    recorderRef.current = recorder;
    window.clearTimeout(chunkTimer.current);
    chunkTimer.current = window.setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, CHUNK_MS);
  }, []);

  const stopPart = useCallback(
    () =>
      new Promise<void>((resolve) => {
        window.clearTimeout(chunkTimer.current);
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") return resolve();
        recorder.addEventListener("stop", () => resolve(), { once: true });
        recorder.stop();
      }),
    [],
  );

  const startTick = useCallback(() => {
    window.clearInterval(tickTimer.current);
    tickTimer.current = window.setInterval(() => {
      const live = partStartedAt.current ? performance.now() - partStartedAt.current : 0;
      setElapsedMs(recordedMs.current + live);
    }, 250);
  }, []);

  const begin = useCallback(
    async (fresh: boolean): Promise<boolean> => {
      if (fresh) {
        recordedMs.current = 0;
        setElapsedMs(0);
      }
      const stream = await acquire();
      if (!stream) return false;
      setState("recording");
      beginPart();
      startTick();
      return true;
    },
    [acquire, beginPart, setState, startTick],
  );

  const start = useCallback(() => begin(true), [begin]);
  const resume = useCallback(() => begin(false), [begin]);

  const pause = useCallback(async () => {
    setState("paused");
    await stopPart();
    window.clearInterval(tickTimer.current);
    setElapsedMs(recordedMs.current);
    releaseStream();
  }, [releaseStream, setState, stopPart]);

  const stop = useCallback(async () => {
    setState("stopped");
    await stopPart();
    window.clearInterval(tickTimer.current);
    setElapsedMs(recordedMs.current);
    releaseStream();
  }, [releaseStream, setState, stopPart]);

  // Leaving the page flushes the current part so nothing recorded is lost.
  useEffect(
    () => () => {
      if (stateRef.current === "recording") {
        stateRef.current = "stopped";
        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") recorder.stop();
      }
      window.clearTimeout(chunkTimer.current);
      window.clearInterval(tickTimer.current);
      releaseStream();
    },
    [releaseStream],
  );

  return { state, mic, error, elapsedMs, level, start, pause, resume, stop };
}