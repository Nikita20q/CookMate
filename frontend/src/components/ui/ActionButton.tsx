import type { ComponentProps } from "react";
import cn from "@/utils/classname-func";

type ActionButtonProps = ComponentProps<"button"> & {
  variant?: "default" | "favorite";
};

export default function ActionButton({
  variant = "default",
  type = "button",
  className,
  ...props
}: ActionButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={cn(
        "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:shrink-0",
        variant === "favorite"
          ? "rounded-full bg-secondary text-accent not-disabled:hover:bg-accent/10"
          : "rounded-lg text-primary not-disabled:hover:bg-secondary",
        className,
      )}
    />
  );
}
