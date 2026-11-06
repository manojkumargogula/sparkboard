import type { ButtonHTMLAttributes, ReactNode } from "react";

import { type ButtonVariant, buttonClass, type ButtonSize } from "./buttonClass";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export function Button({
  variant = "cobalt",
  size = "md",
  icon,
  className,
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}
