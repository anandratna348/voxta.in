import type { ReactNode } from "react";

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl2 border border-paper-line bg-paper-raised shadow-card">
      <header className="border-b border-paper-line px-7 py-5">
        <h2 className="text-base font-semibold text-indigo-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-indigo-500">{description}</p>}
      </header>
      <div className="divide-y divide-paper-line px-7">{children}</div>
    </section>
  );
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-5">
      <div className="min-w-0 max-w-md">
        <p className="text-sm font-semibold text-indigo-800">{label}</p>
        {hint && <p className="mt-1 text-xs leading-relaxed text-indigo-400">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}