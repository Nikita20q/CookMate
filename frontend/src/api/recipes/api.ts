import type { RecognizeResponse, SearchHistoryResponse } from "./types";
import apiClient from "../apiClient";
import { RECIPES_ENDPOINTS } from "./endpoints";
import type { RecipeDetail } from "@/types/recipes";

export const recipesApi = {
  getSearchHistory: async (): Promise<SearchHistoryResponse> => {
    return apiClient.get(RECIPES_ENDPOINTS.searchHistory);
  },

  recognize: async (file: File): Promise<RecognizeResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient.post(RECIPES_ENDPOINTS.recognize, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  findByIngredients: (ingredients: string[]): Promise<RecognizeResponse> => {
    return apiClient.post(RECIPES_ENDPOINTS.search, { ingredients });
  },

  getSuggestions: async (): Promise<RecognizeResponse> => {
    const response: {
      recipeNumber: number;
      recipes: RecognizeResponse["recipes"];
    } = await apiClient.get(RECIPES_ENDPOINTS.suggestions, {
      params: { components: "соль,сахар,вода,черный перец,мука,сода" },
    });
    return {
      recognizedIngredients: [],
      recipeCount: response.recipeNumber,
      recipes: response.recipes,
    };
  },

  getBySlug: (recipeSlug: string): Promise<RecipeDetail> => {
    return apiClient.get(`${RECIPES_ENDPOINTS.getById}/${recipeSlug}`);
  },
};
