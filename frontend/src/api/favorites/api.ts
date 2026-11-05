import apiClient from "../apiClient";
import { FAVORITES_ENDPOINTS } from "./endpoints";
import type { GetFavoritesResponse } from "./types";
import type { Recipe } from "@/types/recipes";

export const favoritesApi = {
  getAll: (): Promise<GetFavoritesResponse> => {
    return apiClient.get(FAVORITES_ENDPOINTS.getAll);
  },

  add: (recipeId: Recipe["id"]): Promise<void> => {
    return apiClient.post(`${FAVORITES_ENDPOINTS.add}/${recipeId}`);
  },

  remove: (recipeId: Recipe["id"]): Promise<void> => {
    return apiClient.delete(`${FAVORITES_ENDPOINTS.remove}/${recipeId}`);
  },
};
