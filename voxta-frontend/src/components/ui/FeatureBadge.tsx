import clsx from "clsx";

export function FeatureBadge({ available }: { available: boolean }) {
  return (
    <span
      className={clsx(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        available ? "bg-sage-50 text-sage-700" : "bg-amber-50 text-amber-700",
      )}
    >
      {available ? "Available" : "Awaiting backend"}
    </span>
  );
}