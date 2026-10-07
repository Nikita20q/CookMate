import { recipesApi } from "@/api/recipes/api";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { useIngredientsStore } from "@/store/ingredients";
import cn from "@/utils/classname-func";
import { useQuery } from "@tanstack/react-query";
import { useLoaderData, useNavigate } from "@tanstack/react-router";
import { Heart, ArrowLeft, Clock, Flame } from "lucide-react";
import { useState } from "react";

export function RecipeDetailPage() {
  const { recipeSlug } = useLoaderData({ from: "/recipes/$acronym" });
  const navigate = useNavigate();
  const [completedSteps] = useState<Set<number>>(new Set());

  const { data: recipe } = useQuery({
    queryKey: ["recipes", recipeSlug],
    queryFn: () => recipesApi.getBySlug(recipeSlug),
  });

  const { currentIngredients } = useIngredientsStore();

  // const fav = isFavorite(recipe.id);
  const fav = false;
  // const toggleStep = (idx: number) => {
  //   setCompletedSteps((prev) => {
  //     const next = new Set(prev);
  //     next.has(idx) ? next.delete(idx) : next.add(idx);
  //     return next;
  //   });
  // };

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Рецепт не найден.</p>
        <button
          onClick={() => navigate({ to: "/recipes" })}
          className="text-primary hover:opacity-70 transition-opacity"
        >
          Назад к рецептам
        </button>
      </div>
    );
  }

  const availableIngredients = recipe.components.filter((ing) =>
    currentIngredients.includes(ing.toLowerCase()),
  );

  const matchScore = Math.round(
    (availableIngredients.length / recipe.components.length) * 100,
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b px-8 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate({ to: ".." })}
          className="text-muted-foreground text-sm flex items-center gap-2 transition-all hover:opacity-70"
        >
          <ArrowLeft size={16} />
          Назад к рецептам
        </button>

        <div className="flex items-center gap-3">
          <span className="bg-primary text-white font-semibold text-sm px-3 py-1.5 rounded-full">
            {matchScore}% совпадение
          </span>
          <button
            // onClick={() => toggle(recipe.id)}
            className={cn(
              "text-sm font-normal flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:opacity-90",
              {
                "bg-[rgba(200,85,42,0.1)] text-accent border border-[rgba(200,85,42,0.3)]":
                  fav,
                "bg-accent text-white": !fav,
              },
            )}
          >
            <Heart
              size={15}
              fill={fav ? "var(--accent)" : "none"}
              stroke={fav ? "var(--accent)" : "white"}
            />
            {fav ? "Сохранено" : "Сохранить рецепт"}
          </button>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-65px)]">
        <div className="flex-shrink-0 flex flex-col w-[420px] border-r">
          <div className="relative h-[280px] flex-shrink-0">
            <ImageWithFallback
              src={recipe.image}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
          </div>

          <div className="px-7 pt-6 pb-4">
            <h1 className="font-['Lora',serif] text-[26px] leading-tight font-semibold text-foreground">
              {recipe.title}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed mt-3">
              {recipe.description}
            </p>
          </div>

          <div className="mx-7 rounded-xl grid grid-cols-2 gap-2 p-4 bg-secondary">
            {[
              {
                icon: <Clock size={16} className="text-primary" />,
                label: "Время",
                value: recipe.approximateTime,
              },
              {
                icon: <Flame size={16} className="text-accent" />,
                label: "Калории",
                value: `${recipe.calories}`,
              },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                {icon}
                <span className="text-[10px] text-muted-foreground">
                  {label}
                </span>
                <span className="text-[13px] font-bold text-foreground">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="px-7 pt-6 pb-8 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-['Lora',serif] text-lg font-semibold text-foreground">
                Ингредиенты
              </h2>
              <span className="text-xs text-muted-foreground">
                <span className="text-primary font-semibold">
                  {
                    recipe.components.filter((i) =>
                      currentIngredients.includes(i),
                    ).length
                  }
                </span>
                /{recipe.components.length} в кладовой
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {recipe.components.map((ing) => {
                const isInPantry = currentIngredients.includes(ing);
                return (
                  <div
                    key={ing}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 rounded-xl border transition-colors",
                      isInPantry
                        ? "bg-[rgba(61,107,79,0.08)] border-[rgba(61,107,79,0.2)]"
                        : "bg-card border-border",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          isInPantry ? "bg-primary" : "bg-muted-foreground",
                        )}
                      />
                      <span className="text-sm text-foreground">{ing}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground"></span>
                      {!isInPantry && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] text-muted-foreground">
                          купить
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 px-8 py-8 overflow-y-auto">
          <div className="max-w-2xl">
            <h2 className="font-['Lora',serif] text-[22px] font-semibold text-foreground mb-5">
              Инструкции
            </h2>

            <div className="flex flex-col gap-3"></div>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${(completedSteps.size / 1) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {completedSteps.size}/0 шагов выполнено
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
