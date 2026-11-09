import { useCallback, useEffect, useRef, useState } from "react";

/** Short, local microphone check for the Settings screen. Nothing is recorded or uploaded. */
export function useMicTest(deviceId?: string) {
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const raf = useRef<number | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);

  const stop = useCallback(() => {
    if (raf.current !== undefined) cancelAnimationFrame(raf.current);
    window.clearTimeout(timer.current);
    void ctx.current?.close().catch(() => undefined);
    ctx.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setActive(false);
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId ? { exact: deviceId } : undefined } });
      stream.current = s;
      const context = new AudioContext();
      ctx.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(s).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let last = 0;
      const loop = (t: number) => {
        raf.current = requestAnimationFrame(loop);
        if (t - last < 60) return;
        last = t;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3.2));
      };
      raf.current = requestAnimationFrame(loop);
      setActive(true);
      timer.current = window.setTimeout(stop, 30000);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setError(
        name === "NotAllowedError"
          ? "Microphone access is blocked. Allow it in Windows Settings under Privacy and security, Microphone."
          : name === "NotFoundError"
            ? "No microphone was found."
            : "The microphone could not be started.",
      );
    }
  }, [deviceId, stop]);

  useEffect(() => stop, [stop]);
  return { active, level, error, start, stop };
}