import { recipesApi } from "@/api/recipes/api";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { useIngredientsStore } from "@/store/ingredients";
import cn from "@/utils/classname-func";
import { useQuery } from "@tanstack/react-query";
import { useLoaderData, useNavigate } from "@tanstack/react-router";
import { Heart, ArrowLeft, Clock, Flame, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import RecipePanels from "@/components/recipes/RecipePanels";

interface Step {
  num: number;
  imageUrl: string;
  stepTitle: string;
  stepInstruction: string;
}

interface RecipeContent {
  steps: Step[];
  description: string;
}

export function RecipeDetailPage() {
  const { recipeSlug } = useLoaderData({ from: "/recipes/$acronym" });
  const navigate = useNavigate();
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const { data: recipe } = useQuery({
    queryKey: ["recipes", recipeSlug],
    queryFn: () => recipesApi.getBySlug(recipeSlug),
  });

  const { currentIngredients } = useIngredientsStore();

  const fav = false;

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

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

  const content: RecipeContent = recipe.contentJson
    ? JSON.parse(recipe.contentJson)
    : { steps: [], description: recipe.description };

  const availableIngredients = recipe.components.filter((ing) =>
    currentIngredients.includes(ing.toLowerCase()),
  );

  const matchScore = Math.round(
    (availableIngredients.length / recipe.components.length) * 100,
  );

  const overview = (
    <div className="flex min-w-0 flex-col [overflow-wrap:anywhere]">
      <div className="relative h-56 shrink-0 sm:h-[280px]">
        <ImageWithFallback
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
      </div>

      <div>
        <div className="px-7 pt-6 pb-4">
          <h1 className="font-['Lora',serif] text-[26px] leading-tight font-semibold text-foreground">
            {recipe.title}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mt-3">
            {content.description || recipe.description}
          </p>
        </div>

        <div className="mx-7 rounded-xl grid grid-cols-2 gap-2 p-4 bg-secondary mb-6">
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

        <div className="px-7 pb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-['Lora',serif] text-lg font-semibold text-foreground">
              Ингредиенты
            </h2>
            <span className="text-xs text-muted-foreground">
              <span className="text-primary font-semibold">
                {availableIngredients.length}
              </span>
              /{recipe.components.length} в кладовой
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {recipe.components.map((ing) => {
              const isInPantry = currentIngredients.includes(
                ing.toLowerCase(),
              );
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
                  {!isInPantry && (
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] text-muted-foreground">
                      купить
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const instructions = (
    <div className="min-w-0 px-4 py-6 [overflow-wrap:anywhere] sm:px-8 sm:py-8">
      <div className="max-w-2xl">
        <h2 className="font-['Lora',serif] text-[22px] font-semibold text-foreground mb-5">
          Инструкции
        </h2>

        <div className="flex flex-col gap-3">
          {content.steps.map((step, idx) => {
            const done = completedSteps.has(idx);
            return (
              <button
                key={step.num}
                onClick={() => toggleStep(idx)}
                className={cn(
                  "w-full text-left flex gap-4 p-5 rounded-xl transition-all hover:shadow-sm active:scale-[0.99] border",
                  done
                    ? "bg-[rgba(61,107,79,0.06)] border-[rgba(61,107,79,0.2)]"
                    : "bg-card border-border",
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {done ? (
                    <CheckCircle2 size={22} className="text-primary" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {step.num}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm leading-relaxed",
                      done
                        ? "text-muted-foreground line-through"
                        : "text-foreground",
                    )}
                  >
                    {step.stepInstruction}
                  </p>
                  {step.imageUrl && (
                    <div className="mt-3 rounded-lg overflow-hidden">
                      <ImageWithFallback
                        src={step.imageUrl}
                        alt={`Шаг ${step.num}`}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {content.steps.length > 0 && (
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${
                    (completedSteps.size / content.steps.length) * 100
                  }%`,
                }}
              />
            </div>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {completedSteps.size}/{content.steps.length} шагов выполнено
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-background xl:h-dvh xl:min-h-0 xl:overflow-hidden">
      {/* Верхняя панель */}
      <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-4 sm:px-8">
        <button
          onClick={() => navigate({ to: "/recipes" })}
          className="text-muted-foreground text-sm flex items-center gap-2 transition-all hover:opacity-70"
        >
          <ArrowLeft size={16} />
          Назад к рецептам
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-primary text-white font-semibold text-sm px-3 py-1.5 rounded-full">
            {matchScore}% совпадение
          </span>
          <button
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

      <RecipePanels overview={overview} instructions={instructions} />
    </div>
  );
}
