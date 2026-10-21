import { normalizeIngredients } from "@/lib/ingredients";
import { create } from "zustand";
import type { RecognizeResponse } from "@/api/recipes/types";
import { recipesApi } from "@/api/recipes/api";

interface IngredientsState {
  currentIngredients: string[];
  recognitionResult: RecognizeResponse | null;
  setRecognitionResult: (result: RecognizeResponse) => void;
  isInitialized: boolean;
  setCurrentIngredients: (ingredients: string[]) => void;
  clearIngredients: () => void;
  initIngredients: () => Promise<void>;
}

export const useIngredientsStore = create<IngredientsState>((set, get) => ({
  currentIngredients: [],
  recognitionResult: null,
  isInitialized: false,

  setCurrentIngredients: (ingredients) =>
    set((state) => {
      const normalized = normalizeIngredients(ingredients);
      if (state.isInitialized && normalized.length === state.currentIngredients.length &&
          normalized.every((ingredient, index) => ingredient === state.currentIngredients[index])) {
        return state;
      }
      return {
        currentIngredients: normalized,
        recognitionResult: null,
        isInitialized: true,
      };
    }),

  setRecognitionResult: (result) =>
    set({
      currentIngredients: normalizeIngredients(result.recognizedIngredients),
      recognitionResult: result,
      isInitialized: true,
    }),

  clearIngredients: () =>
    set({ currentIngredients: [], recognitionResult: null, isInitialized: true }),

  initIngredients: async () => {
    if (get().isInitialized) return;

    try {
      const history = await recipesApi.getSearchHistory();

      // A completed scan or manual edit takes precedence over startup history.
      if (get().isInitialized) return;

      if (history && history.length > 0) {
        set({
          currentIngredients: normalizeIngredients(history[0].ingredients),
        });
      } else {
        set({ currentIngredients: [] });
      }
    } catch (error) {
      console.error("Возникла ошибка:", error);
      if (!get().isInitialized) set({ currentIngredients: [] });
    } finally {
      set({ isInitialized: true });
    }
  },
}));
