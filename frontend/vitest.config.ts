import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: [
        "src/api/**/*.ts",
        "src/store/**/*.ts",
        "src/pages/**/*.tsx",
        "src/components/**/*.tsx",
      ],
      exclude: ["src/api/**/types.ts", "src/api/**/endpoints.ts"],
      reporter: ["text", "html"],
    },
  },
});
