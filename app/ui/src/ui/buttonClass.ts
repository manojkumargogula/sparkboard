import { clsx } from "clsx";

export type ButtonVariant = "cobalt" | "snow" | "ink" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  cobalt: "bg-cobalt text-white hover:bg-cobalt-deep",
  snow: "bg-snow text-night hover:bg-white",
  ink: "bg-night text-snow hover:bg-slate",
  outline: "border border-current/30 text-current hover:border-current hover:bg-current/5",
  ghost: "text-current hover:bg-current/10",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-[15px] gap-2",
  lg: "h-14 px-7 text-base gap-2.5",
  icon: "size-11 justify-center",
};

export const buttonClass = (
  variant: ButtonVariant = "cobalt",
  size: ButtonSize = "md",
  extra?: string,
) =>
  clsx(
    "inline-flex shrink-0 items-center rounded-[6px] font-semibold whitespace-nowrap select-none",
    "transition-[background-color,border-color,transform] duration-200 ease-out active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
