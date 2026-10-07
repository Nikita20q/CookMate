import { RecipeDetailPage } from "@/pages/RecipeDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/recipes/$acronym")({
  component: RecipeDetailPage,
  loader: ({ params }) => {
    const { acronym } = params;

    return { recipeSlug: acronym };
  },
});
