import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ember" | "ghost" | "soft";
type Size = "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-canvas hover:bg-iris shadow-[0_10px_24px_-12px_rgb(75_63_216/0.55)]",
  ember: "bg-ember text-white hover:brightness-110 shadow-[0_12px_28px_-10px_rgb(255_90_54/0.6)]",
  ghost: "text-ink hover:bg-iris-soft",
  soft: "bg-iris-soft text-iris hover:brightness-95 dark:hover:brightness-125",
};

const SIZES: Record<Size, string> = {
  md: "h-11 px-5 text-base gap-2",
  lg: "h-14 px-7 text-lg gap-2.5",
  icon: "size-11 justify-center",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex shrink-0 items-center rounded-full font-semibold whitespace-nowrap select-none",
        "transition-[transform,background-color,filter,box-shadow] duration-200 ease-out",
        "active:scale-[0.96] disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
