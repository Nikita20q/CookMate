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
    set({
      currentIngredients: ingredients.map((i) => i.toLowerCase()),
      recognitionResult: null,
      isInitialized: true,
    }),

  setRecognitionResult: (result) =>
    set({
      currentIngredients: result.recognizedIngredients.map((i) => i.toLowerCase()),
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
          currentIngredients: history[0].ingredients.map((ingredient) =>
            ingredient.toLowerCase(),
          ),
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
