import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { getApiError } from "@/api/errors";

export function setApiFormErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  fallback?: string,
) {
  const { message, fieldErrors } = getApiError(error, fallback);
  const entries = Object.entries(fieldErrors);
  const unmatched: string[] = [];

  for (const [field, text] of entries) {
    const path = fields.find((name) => name === field);
    if (path) setError(path, { type: "server", message: text });
    else unmatched.push(text);
  }

  if (entries.length === 0 || unmatched.length > 0) {
    setError("root.server", {
      type: "server",
      message: unmatched.length ? unmatched.join("; ") : message,
    });
  }
}
