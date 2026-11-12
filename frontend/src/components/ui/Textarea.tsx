import { useId, type ComponentProps } from "react";
import cn from "@/utils/classname-func";
import FormError from "@/components/ui/FormError";

type TextareaProps = ComponentProps<"textarea"> & { error?: string };

export default function Textarea({ className, error, ...props }: TextareaProps) {
  const errorId = useId();
  return (
    <div className="w-full min-w-0 space-y-1">
      <textarea
        {...props}
        aria-invalid={!!error || props["aria-invalid"]}
        aria-describedby={[props["aria-describedby"], error ? errorId : undefined].filter(Boolean).join(" ") || undefined}
        className={cn(
          "w-full resize-y rounded-xl border bg-background px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-primary aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive",
          className,
        )}
      />
      <FormError id={errorId} message={error} />
    </div>
  );
}
