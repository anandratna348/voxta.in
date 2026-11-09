import clsx from "clsx";
import { logoMark, wordmarkDark, wordmarkLight } from "@/assets/brand";

interface Props {
  /** "light" is for dark or coloured backgrounds. It puts the mark on a white tile and uses white lettering. */
  tone?: "dark" | "light";
  size?: "md" | "lg";
  className?: string;
}

const sizes = { md: { mark: 30, word: 19 }, lg: { mark: 40, word: 25 } } as const;

export function BrandLogo({ tone = "dark", size = "md", className }: Props) {
  const s = sizes[size];
  return (
    <div className={clsx("flex items-center", tone === "light" ? "gap-4" : "gap-3", className)}>
      {tone === "light" ? (
        <span className="flex items-center justify-center rounded-xl bg-white px-2 py-1.5 shadow-card">
          <img src={logoMark} alt="" style={{ height: s.mark }} draggable={false} />
        </span>
      ) : (
        <img src={logoMark} alt="" style={{ height: s.mark }} draggable={false} />
      )}
      <img src={tone === "light" ? wordmarkLight : wordmarkDark} alt="Voxta" style={{ height: s.word }} draggable={false} />
    </div>
  );
}