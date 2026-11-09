import clsx from "clsx";

const BARS = Array.from({ length: 36 }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 0.65)));

export function LevelBars({ level, active }: { level: number; active: boolean }) {
  return (
    <div className="flex h-12 items-center gap-[3px]" aria-hidden>
      {BARS.map((shape, i) => (
        <span
          key={i}
          className={clsx("w-1 rounded-full transition-[height] duration-150", active ? "bg-indigo-400" : "bg-lavender-200")}
          style={{ height: `${Math.max(8, active ? level * 100 * shape : 8)}%` }}
        />
      ))}
    </div>
  );
}