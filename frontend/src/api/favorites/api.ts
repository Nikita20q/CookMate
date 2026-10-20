import apiClient from "../apiClient";
import { FAVORITES_ENDPOINTS } from "./endpoints";
import type { GetFavoritesResponse } from "./types";
import type { Recipe } from "@/types/recipes";

export const favoritesApi = {
  getAll: (userId: string): Promise<GetFavoritesResponse> => {
    return apiClient.get(FAVORITES_ENDPOINTS.getAll, { params: { userId } });
  },

  add: (userId: string, recipeId: Recipe["id"]): Promise<void> => {
    return apiClient.post(`${FAVORITES_ENDPOINTS.add}/${recipeId}`, undefined, {
      params: { userId },
    });
  },

  remove: (userId: string, recipeId: Recipe["id"]): Promise<void> => {
    return apiClient.delete(`${FAVORITES_ENDPOINTS.remove}/${recipeId}`, {
      params: { userId },
    });
  },
};
