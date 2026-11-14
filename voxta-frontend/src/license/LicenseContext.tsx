import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError } from "@/api/errors";
import { config } from "@/api/config";
import { licenseApi } from "./api";
import { verifyToken } from "./crypto";
import { getDeviceHash } from "./device";
import { DEFINITIVE_CODES, friendlyLicenseError } from "./messages";
import { readLastChecked, readLastSeen, readToken, writeLastChecked, writeLastSeen, writeToken } from "./storage";
import type { BlockInfo, Entitlement, LicenseStatus } from "./types";

const MINUTE = 60_000;
const REFRESH_EVERY = 6 * 60 * MINUTE;
const CLOCK_SLACK = 5 * MINUTE;

interface LicenseValue {
  status: LicenseStatus;
  entitlement: Entitlement | null;
  block: BlockInfo | null;
  /** A non blocking problem, for example the license server being unreachable. */
  warning: string | null;
  lastCheckedAt: number | null;
  /** False when this build has no license server address or public key. */
  configured: boolean;
  /** Seconds since 1970 when access ends without an online check. */
  accessUntil: number | null;
  has: (feature: string) => boolean;
  activate: (licenseKey: string) => Promise<void>;
  refresh: () => Promise<void>;
  /** Re-reads the stored token, then checks it online. Used by "Check again". */
  recheck: () => Promise<void>;
  deactivate: (options?: { localOnly?: boolean }) => Promise<void>;
}

type Evaluation = { ent: Entitlement } | { block: BlockInfo };

/** Checks a token locally: signature, computer, clock and expiry. */
async function evaluate(token: string): Promise<Evaluation> {
  let ent: Entitlement;
  try {
    ent = await verifyToken(token);
  } catch {
    return { block: { reason: "invalid", message: "This license could not be verified. Please activate again." } };
  }
  if (ent.device !== (await getDeviceHash())) {
    return { block: { reason: "invalid", message: "This license belongs to a different computer. Please activate again." } };
  }

  const nowMs = Date.now();
  const now = Math.floor(nowMs / 1000);
  if (nowMs < readLastSeen() - CLOCK_SLACK || ent.iat > now + 600) {
    return { block: { reason: "clock", message: "Your computer clock looks wrong. Fix the date and time, then check again." } };
  }
  if (ent.license_expires && ent.license_expires <= now) {
    return { block: { reason: "license_expired", message: "This license has expired. Renew your plan to keep using Voxta." } };
  }
  if (ent.exp <= now) {
    return { block: { reason: "token_expired", message: "Voxta needs to verify your license online. Connect to the internet and check again." } };
  }
  writeLastSeen(nowMs);
  return { ent };
}

const LicenseContext = createContext<LicenseValue | null>(null);

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LicenseStatus>("loading");
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [block, setBlock] = useState<BlockInfo | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(readLastChecked);
  const entRef = useRef<Entitlement | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const configured = Boolean(config.licenseApiUrl && config.licensePublicKey);

  const apply = useCallback((result: Evaluation) => {
    if ("ent" in result) {
      entRef.current = result.ent;
      setEntitlement(result.ent);
      setBlock(null);
      setStatus("active");
    } else {
      entRef.current = null;
      setEntitlement(null);
      setBlock(result.block);
      setStatus("blocked");
    }
  }, []);

  const markChecked = useCallback(() => {
    const now = Date.now();
    writeLastChecked(now);
    setLastCheckedAt(now);
  }, []);

  const refresh = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    const run = (async () => {
      const token = readToken();
      if (!token || !configured) return;
      try {
        const res = await licenseApi.refresh(token, await getDeviceHash());
        const result = await evaluate(res.token);
        if ("ent" in result) {
          writeToken(res.token);
          markChecked();
          setWarning(null);
        } else {
          writeToken(null);
        }
        apply(result);
      } catch (error) {
        const definitive = error instanceof ApiError && error.kind === "http" && error.code !== null && DEFINITIVE_CODES.has(error.code);
        if (definitive) {
          writeToken(null);
          apply({ block: { reason: "rejected", message: friendlyLicenseError(error) } });
        } else if (entRef.current) {
          const until = new Date(Math.min(entRef.current.exp, entRef.current.license_expires ?? Infinity) * 1000);
          setWarning(`Could not reach the license server. Voxta keeps working offline until ${until.toLocaleString()}.`);
        }
      }
    })().finally(() => {
      inFlight.current = null;
    });
    inFlight.current = run;
    return run;
  }, [apply, configured, markChecked]);

  // Startup: read the stored token, verify it, then check it online in the background.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = readToken();
      if (!token) {
        if (!cancelled) setStatus("unlicensed");
        return;
      }
      const result = await evaluate(token);
      if (cancelled) return;
      apply(result);
      void refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [apply, refresh]);

  // While the app is open: notice expiry promptly, and re-check online every few hours.
  useEffect(() => {
    const local = window.setInterval(async () => {
      const token = readToken();
      if (!token) return;
      const result = await evaluate(token);
      if ("block" in result) apply(result);
    }, MINUTE);
    const online = window.setInterval(() => void refresh(), REFRESH_EVERY);
    const onFocus = () => {
      const last = readLastChecked() ?? 0;
      if (Date.now() - last > 60 * MINUTE) void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(local);
      window.clearInterval(online);
      window.removeEventListener("focus", onFocus);
    };
  }, [apply, refresh]);

  const activate = useCallback(
    async (licenseKey: string) => {
      if (!configured) throw new Error("Licensing is not configured in this build.");
      try {
        const res = await licenseApi.activate(licenseKey.trim(), await getDeviceHash());
        const result = await evaluate(res.token);
        if ("block" in result) throw new Error(result.block.message);
        writeToken(res.token);
        markChecked();
        setWarning(null);
        apply(result);
      } catch (error) {
        throw new Error(friendlyLicenseError(error));
      }
    },
    [apply, configured, markChecked],
  );

  const recheck = useCallback(async () => {
    const token = readToken();
    if (!token) return;
    // A fresh local evaluation first. This lets a corrected clock take effect.
    const result = await evaluate(token);
    if ("ent" in result) apply(result);
    await refresh();
  }, [apply, refresh]);

  const deactivate = useCallback(
    async (options?: { localOnly?: boolean }) => {
      const token = readToken();
      if (token && !options?.localOnly) {
        try {
          await licenseApi.deactivate(token, await getDeviceHash());
        } catch (error) {
          throw new Error(friendlyLicenseError(error));
        }
      }
      writeToken(null);
      entRef.current = null;
      setEntitlement(null);
      setBlock(null);
      setWarning(null);
      setStatus("unlicensed");
    },
    [],
  );

  const value = useMemo<LicenseValue>(
    () => ({
      status,
      entitlement,
      block,
      warning,
      lastCheckedAt,
      configured,
      accessUntil: entitlement ? Math.min(entitlement.exp, entitlement.license_expires ?? Infinity) : null,
      has: (feature: string) => entitlement?.features.includes(feature) ?? false,
      activate,
      refresh,
      recheck,
      deactivate,
    }),
    [status, entitlement, block, warning, lastCheckedAt, configured, activate, refresh, recheck, deactivate],
  );

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export function useLicense(): LicenseValue {
  const ctx = useContext(LicenseContext);
  if (!ctx) throw new Error("useLicense must be used inside LicenseProvider");
  return ctx;
}