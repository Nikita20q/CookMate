import { Link } from "@tanstack/react-router";
import { Clock, Flame } from "lucide-react";
import type { Recipe } from "@/types/recipes";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import FavoriteButton from "./FavoriteButton";

interface FavoriteRecipeCardProps {
  recipe: Recipe;
  currentIngredients: string[];
}

export default function FavoriteRecipeCard({
  recipe,
  currentIngredients,
}: FavoriteRecipeCardProps) {
  const pantry = new Set(
    currentIngredients.map((ingredient) => ingredient.trim().toLowerCase()),
  );
  const matched = recipe.components.filter((ingredient) =>
    pantry.has(ingredient.trim().toLowerCase()),
  ).length;
  const matchScore = recipe.components.length
    ? Math.round((matched / recipe.components.length) * 100)
    : 0;

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card">
      <Link
        to="/recipes/$acronym"
        params={{ acronym: recipe.slug }}
        className="group flex flex-1 flex-col focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        <div className="relative overflow-hidden">
          <ImageWithFallback
            src={recipe.image}
            alt={recipe.title}
            className="h-48 w-full object-cover transition-transform group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">
            {matchScore}% совпадение
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h2 className="font-serif text-lg leading-snug [overflow-wrap:anywhere]">
            {recipe.title}
          </h2>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {recipe.description}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {recipe.approximateTime}
            </span>
            {recipe.calories != null && (
              <span className="flex items-center gap-1">
                <Flame size={13} />
                {recipe.calories} ккал
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {recipe.components.slice(0, 3).map((ingredient) => (
              <span
                key={ingredient}
                className="max-w-full truncate rounded-full bg-secondary px-2 py-1 text-[11px] text-muted-foreground"
              >
                {ingredient}
              </span>
            ))}
          </div>
        </div>
      </Link>
      <FavoriteButton recipe={recipe} variant="remove" />
    </article>
  );
}
