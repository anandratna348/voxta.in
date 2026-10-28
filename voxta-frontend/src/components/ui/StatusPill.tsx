import clsx from "clsx";
import type { SessionStatus } from "@/api/types";

const styles: Record<SessionStatus, { label: string; cls: string; dot: string }> = {
  active: { label: "In progress", cls: "bg-sage-50 text-sage-700", dot: "bg-sage-500" },
  paused: { label: "Paused", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  completed: { label: "Completed", cls: "bg-indigo-50 text-indigo-600", dot: "bg-indigo-400" },
};

export function StatusPill({ status }: { status: SessionStatus }) {
  const s = styles[status] ?? styles.completed;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", s.cls)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}