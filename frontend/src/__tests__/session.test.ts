import { describe, expect, it } from "vitest";
import { safeReturnTo } from "@/lib/session";

describe("Безопасный адрес возврата", () => {
  it.each([
    undefined, {}, "https://evil.example", "//evil.example", "/\\evil.example",
    "/%2fevil.example", "/recipes/%5cevil", "/auth/login", "/auth/register",
    "javascript:alert(1)", "/recipes/../../auth/login", "/\nevil.example",
  ])("отклоняет %j", (value) => {
    expect(safeReturnTo(value)).toBe("/");
  });

  it.each(["/", "/favorites", "/recipes", "/recipes/omlet?tab=steps#step-2"])(
    "сохраняет внутренний адрес %s", (value) => {
      expect(safeReturnTo(value)).toBe(value);
    },
  );
});
