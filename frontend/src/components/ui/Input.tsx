import type { ComponentProps } from "react";
import cn from "@/utils/classname-func";

type InputProps = ComponentProps<"input"> & {
  variant?: "default" | "compact";
};

export default function Input({ className, variant = "default", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={cn(
        "w-full min-w-0 border bg-background py-2 focus-visible:outline-2 focus-visible:outline-primary",
        variant === "compact"
          ? "rounded-lg px-2 text-sm text-foreground"
          : "rounded-xl px-3 text-base",
        className,
      )}
    />
  );
}
