import { createFileRoute } from "@tanstack/react-router";
import ArchivedRecipesPage from "@/pages/ArchivedRecipesPage";

export const Route = createFileRoute("/recipes/archive")({
  component: ArchivedRecipesPage,
});
