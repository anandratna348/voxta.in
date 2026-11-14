import { ExternalLink, KeyRound, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { config } from "@/api/config";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Equalizer } from "@/components/brand/Equalizer";
import { Splash } from "@/components/layout/Splash";
import { Button } from "@/components/ui/Button";
import { useLicense } from "@/license/LicenseContext";
import { openExternal } from "@/lib/external";

const BLOCK_TITLES = {
  token_expired: "Online check needed",
  clock: "Check your clock",
  license_expired: "License expired",
  rejected: "License not valid",
  invalid: "License not valid",
} as const;

export default function ActivationPage() {
  const { status, block, configured, activate, recheck } = useLicense();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "loading") return <Splash />;
  if (status === "active") return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await activate(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed.");
      setBusy(false);
    }
  }

  async function checkAgain() {
    setChecking(true);
    await recheck();
    setChecking(false);
  }

  const canRecheck = block?.reason === "token_expired" || block?.reason === "clock";

  return (
    <div className="grid min-h-full bg-paper lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-hero-gradient p-14 text-white lg:flex">
        <Equalizer className="pointer-events-none absolute -right-4 bottom-0 h-[55%] w-64 pr-16" />
        <BrandLogo tone="light" size="lg" />
        <div className="relative max-w-md">
          <h1 className="font-display text-5xl leading-[1.08] tracking-tight">Walk into every interview prepared.</h1>
          <p className="mt-5 text-lg leading-relaxed text-indigo-100">
            Voxta follows the conversation, spots the questions, and drafts answers you can say in your own voice.
          </p>
        </div>
        <p className="relative flex items-center gap-2 text-sm text-indigo-200">
          <ShieldCheck className="h-4 w-4" />
          Your meetings are stored locally on this computer.
        </p>
      </section>

      <section className="flex items-center justify-center bg-wash p-8">
        <div className="w-full max-w-sm">
          <BrandLogo size="lg" className="mb-10 lg:hidden" />

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-3xl text-indigo-950">Activate Voxta</h2>
          <p className="mt-2 text-indigo-500">Enter the license key you received after purchasing a plan.</p>

          {block && (
            <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">{BLOCK_TITLES[block.reason]}</p>
                <p className="mt-1 leading-relaxed">{block.message}</p>
                {canRecheck && (
                  <Button variant="secondary" className="mt-3" loading={checking} onClick={checkAgain} icon={<RefreshCw className="h-4 w-4" />}>
                    Check again
                  </Button>
                )}
              </div>
            </div>
          )}

          {!configured ? (
            <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm leading-relaxed text-rose-700">
              Licensing is not configured in this build. Set VITE_LICENSE_API_URL and VITE_LICENSE_PUBLIC_KEY in the .env file, then restart the app.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-8">
              <label htmlFor="license-key" className="text-sm font-semibold text-indigo-800">License key</label>
              <input
                id="license-key"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                placeholder="VOXTA-XXXX-XXXX-XXXX-XXXX"
                autoComplete="off"
                spellCheck={false}
                autoFocus
                className="mt-2 h-12 w-full rounded-xl border border-paper-line bg-paper-raised px-4 font-mono text-sm tracking-wider text-indigo-900 shadow-card placeholder:text-indigo-300 focus:border-lavender-400 focus:outline-none focus:shadow-focus"
              />
              {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm leading-relaxed text-rose-700">{error}</p>}
              <Button type="submit" size="lg" className="mt-5 w-full" loading={busy} disabled={key.length < 12}>
                Activate
              </Button>
              <p className="mt-4 text-xs leading-relaxed text-indigo-400">
                Activation links the license to this computer. Your key is sent only to the Voxta license server and is not kept in the app.
              </p>
            </form>
          )}

          {config.purchaseUrl && (
            <button onClick={() => void openExternal(config.purchaseUrl)} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
              Do not have a key? Choose a plan <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}