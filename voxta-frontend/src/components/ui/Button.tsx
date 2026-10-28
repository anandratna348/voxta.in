import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "light";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
  size?: "md" | "lg";
}

const variants: Record<Variant, string> = {
  primary: "bg-brand-gradient text-white shadow-card hover:shadow-lift",
  secondary: "border border-paper-line bg-paper-raised text-indigo-800 hover:bg-lavender-50",
  ghost: "text-indigo-600 hover:bg-lavender-100",
  light: "bg-white text-indigo-800 shadow-card hover:shadow-lift",
};

export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-shadow duration-200",
        "disabled:cursor-not-allowed disabled:opacity-60",
        size === "md" ? "h-10 px-4 text-sm" : "h-12 px-6 text-[15px]",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}