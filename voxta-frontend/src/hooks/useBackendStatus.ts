import { useCallback, useEffect, useRef, useState } from "react";
import { healthApi } from "@/api/services";
import { config } from "@/api/config";

export type BackendState = "checking" | "online" | "offline";

export interface BackendStatus {
  state: BackendState;
  lastCheckedAt: Date | null;
  recheck: () => void;
}

export function useBackendStatus(): BackendStatus {
  const [state, setState] = useState<BackendState>("checking");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const check = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const res = await healthApi.check(controller.signal);
      if (controller.signal.aborted) return;
      setState(res.status === "ok" ? "online" : "offline");
    } catch {
      if (controller.signal.aborted) return;
      setState("offline");
    }
    setLastCheckedAt(new Date());
  }, []);

  useEffect(() => {
    void check();
    const id = window.setInterval(() => void check(), config.healthPollMs);
    return () => {
      window.clearInterval(id);
      controllerRef.current?.abort();
    };
  }, [check]);

  return { state, lastCheckedAt, recheck: () => void check() };
}