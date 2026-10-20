import type { Recipe } from "@/types/recipes";
import { useState } from "react";
import { ImageWithFallback } from "../ui/ImageWithFallback";
import { ChevronDown, ChevronUp, Clock, Flame } from "lucide-react";
import Ingredient from "../ui/Ingredient";
import Hint from "../ui/Hint";
import FavoriteButton from "./FavoriteButton";
import Button from "../ui/Button";
import { Link } from "@tanstack/react-router";

interface Props {
  recipe: Recipe;
  currentIngredients: string[];
}

const RecipeAccordionItem = ({ recipe, currentIngredients }: Props) => {
  const [open, setOpen] = useState(false);
  const availableIngredients = recipe.components.filter((ing) =>
    currentIngredients.includes(ing.toLowerCase()),
  );

  const matchScore = Math.round(
    recipe.components.length
      ? (availableIngredients.length / recipe.components.length) * 100
      : 0,
  );

  return (
    <div className="relative rounded-2xl overflow-hidden transition-all bg-card mb-3 border border-custom">
      <FavoriteButton recipe={recipe} className="absolute right-4 top-4 z-10" />
      <button className="w-full text-left" onClick={() => setOpen((v) => !v)}>
        <div className="flex gap-4 p-4">
          <div className="relative flex-shrink-0">
            <ImageWithFallback
              src={recipe.image}
              alt={recipe.title}
              className="rounded-xl object-cover w-[100px] h-[100px]"
            />
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center bg-primary border border-card border-[2px]">
              <span className="text-white text-xs font-bold">
                {matchScore}%
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 pr-12">
              <div className="flex-1">
                <p className="text-lg text-foreground font-medium leading-[1.3]">
                  {recipe.title}
                </p>
                <Hint text={recipe.description} className="text-sm! mt-1" />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock size={13} />
                {recipe.approximateTime}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Flame size={13} />
                {recipe.calories} ккал
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center pb-2 gap-1 text-muted-foreground">
          <span className="text-xs">{open ? "Скрыть" : "Подробнее"}</span>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </button>

      {open && (
        <div className="border-t border-custom">
          <div className="p-5 grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
                Ингредиенты
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recipe.components.map((ing) => (
                  <Ingredient
                    key={ing}
                    className="text-xs"
                    available={currentIngredients.includes(ing)}
                    title={`${currentIngredients.includes(ing) ? "✓ " : ""}${ing}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <span className="text-primary font-semibold">
                  {availableIngredients.length}
                </span>
                /{recipe.components.length} ингредиентов в наличии
              </p>
            </div>

            <div className="flex flex-col justify-between">
              <div />
              <Link to={"/recipes/$acronym"} params={{ acronym: recipe.slug }}>
                <Button text="Посмотреть полный рецепт" nofocus />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeAccordionItem;
