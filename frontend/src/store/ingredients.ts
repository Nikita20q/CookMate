import { normalizeIngredients } from "@/lib/ingredients";
import { create } from "zustand";
import type { RecognizeResponse } from "@/api/recipes/types";
import { recipesApi } from "@/api/recipes/api";
import { getApiError } from "@/api/errors";

interface IngredientsState {
  currentIngredients: string[];
  recognitionResult: RecognizeResponse | null;
  setRecognitionResult: (result: RecognizeResponse) => void;
  isInitialized: boolean;
  isInitializing: boolean;
  historyError: string | null;
  setCurrentIngredients: (ingredients: string[]) => void;
  clearIngredients: () => void;
  initIngredients: () => Promise<void>;
}

export const useIngredientsStore = create<IngredientsState>((set, get) => ({
  currentIngredients: [],
  recognitionResult: null,
  isInitialized: false,
  isInitializing: false,
  historyError: null,

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
        historyError: null,
      };
    }),

  setRecognitionResult: (result) =>
    set({
      currentIngredients: normalizeIngredients(result.recognizedIngredients),
      recognitionResult: result,
      isInitialized: true,
      historyError: null,
    }),

  clearIngredients: () =>
    set({ currentIngredients: [], recognitionResult: null, isInitialized: true, historyError: null }),

  initIngredients: async () => {
    if (get().isInitializing || (get().isInitialized && !get().historyError)) return;
    set({ isInitializing: true, isInitialized: false, historyError: null });

    try {
      const history = await recipesApi.getSearchHistory();

      // Ручные изменения важнее загруженной истории.
      if (get().isInitialized) return;

      if (history && history.length > 0) {
        set({
          currentIngredients: normalizeIngredients(history[0].ingredients),
        });
      } else {
        set({ currentIngredients: [] });
      }
    } catch (error) {
      if (!get().isInitialized) set({
        historyError: getApiError(error, "Не удалось загрузить историю сканирования.").message,
      });
    } finally {
      set({ isInitialized: true, isInitializing: false });
    }
  },
}));
