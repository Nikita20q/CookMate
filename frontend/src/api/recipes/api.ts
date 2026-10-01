import type { RecognizeResponse, SearchHistoryResponse } from "./types";
import apiClient from "../apiClient";
import { RECIPES_ENDPOINTS } from "./endpoints";

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
};
