import { Info, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { config } from "@/api/config";
import { toErrorMessage } from "@/api/errors";
import { authApi } from "@/api/services";
import { BrandMark } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { openExternal } from "@/lib/external";

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launched, setLaunched] = useState(false);
  const [devName, setDevName] = useState("");

  if (user) return <Navigate to="/" replace />;

  async function googleSignIn() {
    setBusy(true);
    setError(null);
    try {
      const { authorization_url } = await authApi.startGoogleLogin();
      await openExternal(authorization_url);
      setLaunched(true);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function devSignIn(e: FormEvent) {
    e.preventDefault();
    const name = devName.trim() || "Developer";
    signIn({
      id: "dev-local-user",
      google_id: "",
      email: "",
      name,
      picture: "",
      created_at: new Date().toISOString(),
      isDevSession: true,
    });
    navigate("/", { replace: true });
  }

  return (
    <div className="grid min-h-full bg-paper lg:grid-cols-[1.05fr_1fr]">
      <section className="hidden flex-col justify-between bg-brand-gradient p-14 text-white lg:flex">
        <div className="flex items-center gap-3">
          <BrandMark className="h-10 w-10 bg-white/15 text-xl shadow-none" />
          <span className="font-display text-2xl">Voxta</span>
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-5xl leading-[1.1]">Walk into every interview prepared.</h1>
          <p className="mt-5 text-lg leading-relaxed text-indigo-100">
            Voxta follows the conversation, spots the questions, and drafts answers you can say in your own voice.
          </p>
        </div>
        <p className="flex items-center gap-2 text-sm text-indigo-200">
          <ShieldCheck className="h-4 w-4" />
          Your meetings are stored locally on this computer.
        </p>
      </section>

      <section className="flex items-center justify-center bg-wash p-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <BrandMark className="h-9 w-9 text-xl" />
            <span className="font-display text-2xl text-indigo-900">Voxta</span>
          </div>

          <h2 className="font-display text-3xl text-indigo-900">Welcome back</h2>
          <p className="mt-2 text-indigo-500">Sign in to open your meetings and copilot.</p>

          <button
            onClick={googleSignIn}
            disabled={busy}
            className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-paper-line bg-white text-[15px] font-semibold text-indigo-900 shadow-card transition-shadow hover:shadow-lift disabled:opacity-60"
          >
            <GoogleG />
            {busy ? "Opening Google..." : "Continue with Google"}
          </button>

          {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

          {launched && (
            <div role="status" className="mt-4 flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Google sign-in opened in your browser and the backend can complete it, but it does not yet expose the
                result to this app. Sign-in here is awaiting a backend endpoint.
              </p>
            </div>
          )}

          {config.devLoginEnabled && (
            <form onSubmit={devSignIn} className="mt-10 rounded-xl2 border border-dashed border-lavender-300 p-5">
              <p className="text-sm font-semibold text-indigo-800">Development session</p>
              <p className="mt-1 text-xs leading-relaxed text-indigo-400">
                For testing only. This is not authentication. It stores meetings under a local test user.
              </p>
              <input
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                placeholder="Display name"
                aria-label="Display name"
                className="mt-3 h-10 w-full rounded-xl border border-paper-line bg-paper-raised px-3 text-sm focus:border-lavender-400 focus:outline-none focus:shadow-focus"
              />
              <Button type="submit" variant="secondary" className="mt-3 w-full">Start development session</Button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}