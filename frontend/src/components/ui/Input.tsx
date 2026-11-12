import { useId, type ComponentProps } from "react";
import cn from "@/utils/classname-func";
import FormError from "@/components/ui/FormError";

type InputProps = ComponentProps<"input"> & {
  variant?: "default" | "compact";
  error?: string;
  containerClassName?: string;
  suffix?: string;
};

export default function Input({ className, variant = "default", error, containerClassName, suffix, ...props }: InputProps) {
  const errorId = useId();
  const suffixId = `${errorId}-suffix`;
  return (
    <div className={cn("w-full min-w-0 space-y-1", containerClassName)}>
      <div className="relative">
      <input
        {...props}
        aria-invalid={!!error || props["aria-invalid"]}
        aria-describedby={[props["aria-describedby"], suffix ? suffixId : undefined, error ? errorId : undefined].filter(Boolean).join(" ") || undefined}
        className={cn(
          "w-full min-w-0 border bg-background py-2 focus-visible:outline-2 focus-visible:outline-primary aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive",
          variant === "compact"
            ? "rounded-lg px-2 text-sm text-foreground"
            : "rounded-xl px-3 text-base",
          className,
          suffix && "pr-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
      {suffix && <span id={suffixId} className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-normal text-muted-foreground">{suffix}</span>}
      </div>
      <FormError id={errorId} message={error} />
    </div>
  );
}
