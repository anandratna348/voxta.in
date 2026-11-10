import clsx from "clsx";

interface Props {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}

export function Switch({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-brand-gradient" : "bg-lavender-300")}
    >
      <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-card transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}