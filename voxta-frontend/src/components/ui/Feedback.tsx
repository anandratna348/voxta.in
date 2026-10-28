import clsx from "clsx";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xl bg-lavender-100", className)} aria-hidden />;
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl2 border border-dashed border-lavender-300 bg-lavender-50/60 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lavender-100 text-indigo-500">{icon}</div>
      <h3 className="mt-4 text-base font-semibold text-indigo-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-indigo-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-4 rounded-xl2 border border-rose-100 bg-rose-50 p-5">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-rose-700">This could not be loaded</p>
        <p className="mt-1 text-sm text-rose-700/90">{message}</p>
        <p className="mt-1 text-xs text-rose-700/70">If it keeps happening, check the backend terminal for details.</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} icon={<RefreshCw className="h-4 w-4" />}>
          Try again
        </Button>
      )}
    </div>
  );
}