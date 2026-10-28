import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toErrorMessage } from "@/api/errors";
import { sessionsApi } from "@/api/services";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

function defaultTitle(): string {
  return `Interview on ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date())}`;
}

export function NewMeetingDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState(defaultTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const session = await sessionsApi.create(user.id, title.trim());
      navigate(`/workspace/${session.id}`);
    } catch (err) {
      setError(toErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/30 p-6" onMouseDown={() => !saving && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-meeting-title"
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl2 border border-paper-line bg-paper-raised p-7 shadow-lift"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="new-meeting-title" className="font-display text-2xl text-indigo-900">New meeting</h2>
            <p className="mt-1 text-sm text-indigo-500">Give it a name you will recognise in your history.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-indigo-400 hover:bg-lavender-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label htmlFor="meeting-title" className="mt-6 block text-sm font-semibold text-indigo-800">Meeting title</label>
        <input
          id="meeting-title"
          ref={inputRef}
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-paper-line bg-paper px-4 text-sm text-indigo-900 placeholder:text-indigo-300 focus:border-lavender-400 focus:outline-none focus:shadow-focus"
          placeholder="Frontend engineer interview"
        />

        {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}

        <div className="mt-7 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving} disabled={!title.trim()}>Create meeting</Button>
        </div>
      </form>
    </div>
  );
}