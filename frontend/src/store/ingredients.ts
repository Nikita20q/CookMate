// import { create } from "zustand";

// interface IngredientsState {
//   currentIngredients: string[];
//   setCurrentIngredients: (ingredients: string[]) => void;
//   clearIngredients: () => void;
// }

// export const useIngredientsStore = create<IngredientsState>((set) => ({
//   currentIngredients: [],
//   setCurrentIngredients: (ingredients) =>
//     set({ currentIngredients: ingredients }),
//   clearIngredients: () => set({ currentIngredients: [] }),
// }));

import { create } from "zustand";
import { recipesApi } from "@/api/recipes/api";

interface IngredientsState {
  currentIngredients: string[];
  isInitialized: boolean;
  setCurrentIngredients: (ingredients: string[]) => void;
  clearIngredients: () => void;
  initIngredients: () => Promise<void>;
}

export const useIngredientsStore = create<IngredientsState>((set) => ({
  currentIngredients: [],
  isInitialized: false,

  setCurrentIngredients: (ingredients) =>
    set({ currentIngredients: ingredients, isInitialized: true }),

  clearIngredients: () => set({ currentIngredients: [] }),

  initIngredients: async () => {
    try {
      const history = await recipesApi.getSearchHistory();

      if (history && history.length > 0) {
        set({ currentIngredients: history[0].ingredients });
      } else {
        set({ currentIngredients: [] });
      }
    } catch (error) {
      console.error("Возникла ошибка:", error);
      set({ currentIngredients: [] });
    } finally {
      set({ isInitialized: true });
    }
  },
}));
