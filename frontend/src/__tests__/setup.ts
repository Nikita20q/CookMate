import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { useAuthStore } from "@/store/auth";
import { useIngredientsStore } from "@/store/ingredients";

beforeEach(() => {
  localStorage.clear();
  useAuthStore.getState().clearAuth();
  useIngredientsStore.setState({
    currentIngredients: [],
    recognitionResult: null,
    isInitialized: false,
  });
  vi.stubGlobal(
    "matchMedia",
    vi.fn((media: string) => ({
      matches: media === "(min-width: 48rem)" || media === "(min-width: 64rem)",
      media,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
