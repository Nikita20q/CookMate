// import apiClient from "../apiClient";
// import { INGREDIENTS_ENDPOINTS } from "./endpoints";
import type { GetLastIngredientsResponse } from "./types";

const ingredientsMock = [
  "молоко",
  "яйцо",
  "зелень",
  "рис",
  "сыр",
  "масло сливочное",
];

export const ingredientsApi = {
  getLast: async (): Promise<GetLastIngredientsResponse> => {
    // return await apiClient.get(INGREDIENTS_ENDPOINTS.getLast);
    return Promise.resolve({
      ingredientsNumber: ingredientsMock.length,
      ingredients: ingredientsMock,
    });
    // return Promise.resolve({
    //   ingredientsNumber: 0,
    //   ingredients: [],
    // });
  },
  addIngredient: async (
    newIng: string,
  ): Promise<GetLastIngredientsResponse> => {
    return Promise.resolve({
      ingredientsNumber: ingredientsMock.length + 1,
      ingredients: [...ingredientsMock, newIng],
    });
  },
};
