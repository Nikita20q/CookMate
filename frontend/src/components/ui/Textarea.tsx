import type { ComponentProps } from "react";
import cn from "@/utils/classname-func";

export default function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full resize-y rounded-xl border bg-background px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-primary",
        className,
      )}
    />
  );
}
