import type { Recipe } from "@/types/recipes";

export interface GetFavoritesResponse {
  recipeNumber: number;
  recipes: Recipe[];
}
