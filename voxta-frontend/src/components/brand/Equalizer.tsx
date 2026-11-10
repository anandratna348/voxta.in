import clsx from "clsx";

const HEIGHTS = [38, 64, 100, 72, 48];

/** Decorative sound bars echoing the logo. Purely visual. */
export function Equalizer({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <div className={clsx("flex items-end gap-2.5", className)} aria-hidden>
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={clsx("w-3 rounded-full", tone === "light" ? "bg-white/20" : "bg-indigo-600/15")}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}