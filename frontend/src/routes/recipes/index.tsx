import { RecipesListPage } from "@/pages/RecipesListPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/recipes/")({
  component: RecipesListPage,
});
