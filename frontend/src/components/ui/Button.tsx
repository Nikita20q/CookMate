import type { ComponentProps } from "react";
import cn from "@/utils/classname-func";

interface ButtonStyleProps {
  variant?: "primary" | "secondary" | "outline" | "favorite" | "destructive";
  text?: string;
}

function buttonClassName(
  variant: ButtonStyleProps["variant"],
  className?: string,
) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>svg]:shrink-0",
    {
      "border-transparent bg-primary text-primary-foreground not-disabled:hover:opacity-90": variant === "primary",
      "border-custom bg-secondary text-foreground not-disabled:hover:bg-muted": variant === "secondary",
      "border-primary bg-transparent text-primary not-disabled:hover:bg-primary/10": variant === "outline",
      "border-transparent bg-destructive text-destructive-foreground not-disabled:hover:opacity-90": variant === "destructive",
      "border-accent bg-accent text-white not-disabled:hover:opacity-90 aria-pressed:border-accent/30 aria-pressed:bg-accent/10 aria-pressed:text-accent": variant === "favorite",
    },
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & ButtonStyleProps;

export function ButtonAnchor({
  text,
  children,
  className,
  variant = "primary",
  ...props
}: ComponentProps<"a"> & ButtonStyleProps) {
  return (
    <a {...props} className={buttonClassName(variant, className)}>
      {children ?? (text !== undefined ? <span className="font-medium">{text}</span> : null)}
    </a>
  );
}

export default function Button({
  text,
  children,
  type = "button",
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button {...props} type={type} className={buttonClassName(variant, className)}>
      {children ?? (text !== undefined ? <span className="font-medium">{text}</span> : null)}
    </button>
  );
}
