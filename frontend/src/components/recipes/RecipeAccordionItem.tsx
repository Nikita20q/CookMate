import type { Recipe } from "@/types/recipes";
import { useState } from "react";
import { ImageWithFallback } from "../ui/ImageWithFallback";
import { ChevronDown, ChevronUp, Clock, Flame, Heart } from "lucide-react";
import Ingredient from "../ui/Ingredient";
import Hint from "../ui/Hint";
import cn from "@/utils/classname-func";
import Button from "../ui/Button";

interface Props {
  recipe: Recipe;
  currentIngredients: string[];
}

const RecipeAccordionItem = ({ recipe, currentIngredients }: Props) => {
  const [open, setOpen] = useState(false);
  const [fav, setFav] = useState(false);

  const handleSetFav = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    setFav((val) => !val);
  };

  const availableIngredients = recipe.components.filter((ing) =>
    currentIngredients.includes(ing.toLowerCase()),
  );

  const matchScore = Math.round(
    (availableIngredients.length / recipe.components.length) * 100,
  );

  return (
    <div className="rounded-2xl overflow-hidden transition-all bg-card mb-3 border border-custom">
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
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-lg text-foreground font-medium leading-[1.3]">
                  {recipe.title}
                </p>
                <Hint text={recipe.description} className="text-sm! mt-1" />
              </div>

              <button
                className={cn(
                  "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:opacity-80",
                  fav ? "bg-[rgba(200,85,42,0.1)]" : "bg-secondary",
                )}
                onClick={handleSetFav}
              >
                <Heart
                  size={17}
                  fill={fav ? "var(--accent)" : "none"}
                  stroke={fav ? "var(--accent)" : "var(--muted-foreground)"}
                />
              </button>
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
              <Button text="Посмотреть полный рецепт" nofocus />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeAccordionItem;
