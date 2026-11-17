export const RECIPES_ENDPOINTS = {
  searchHistory: "/search-history",
  suggestions: "/recipes",
  search: "/recipes/search",
  recognize: "/recipes/recognize",
  getById: "/recipes/recipe",
  updateRecipe: (recipeId: string | number) => `/admin/recipes/${encodeURIComponent(recipeId)}`,
} as const;
