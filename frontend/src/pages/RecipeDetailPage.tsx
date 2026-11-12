import Button from "@/components/ui/Button";
import { matchRecipe } from "@/lib/ingredients";
import { recipesApi } from "@/api/recipes/api";
import { getApiError } from "@/api/errors";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import PhotoEditor from "@/components/ui/PhotoEditor";
import { useIngredientsStore } from "@/store/ingredients";
import cn from "@/utils/classname-func";
import { useQuery } from "@tanstack/react-query";
import { Link, useLoaderData } from "@tanstack/react-router";
import { ArrowLeft, Clock, Flame, CheckCircle2, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";
import RecipePanels from "@/components/recipes/RecipePanels";
import RecipeEditActions from "@/components/recipes/RecipeEditActions";
import RecipeIngredientsEditor from "@/components/recipes/RecipeIngredientsEditor";
import RecipeStepsEditor from "@/components/recipes/RecipeStepsEditor";
import FavoriteButton from "@/components/recipes/FavoriteButton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthStore } from "@/store/auth";
import type { RecipeEditorValues } from "@/types/recipe-editor";

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
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const accessToken = useAuthStore((state) => state.accessToken);
  const { canManageRecipes } = useCurrentUser();
  const form = useForm<RecipeEditorValues>();
  const { register, reset, control } = form;
  const { field: imageField } = useController({ control, name: "image", defaultValue: "" });
  const { field: imageFileField } = useController({ control, name: "imageFile", defaultValue: null });
  const draftIngredients = useWatch({ control, name: "components", defaultValue: [] });
  const [editingContext, setEditingContext] = useState<{
    recipeSlug: string;
    accessToken: string;
  } | null>(null);
  const isEditing =
    canManageRecipes &&
    editingContext?.recipeSlug === recipeSlug &&
    editingContext?.accessToken === accessToken;

  const {
    data: recipe,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["recipes", recipeSlug],
    queryFn: () => recipesApi.getBySlug(recipeSlug),
  });

  const { currentIngredients } = useIngredientsStore();

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

  const cancelEditing = () => {
    reset();
    setEditingContext(null);
  };

  if (isPending) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center text-muted-foreground"
      >
        Загружаем рецепт…
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4"
      >
        <p>{getApiError(error, "Не удалось загрузить рецепт.").message}</p>
        <Button
          variant="primary"
          onClick={() => {
            refetch();
          }}
          className="w-auto"
        >
          Повторить загрузку
        </Button>
        <Link to="/recipes" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2">
          Назад к рецептам
        </Link>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Рецепт не найден.</p>
        <Link to="/recipes" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2">
          Назад к рецептам
        </Link>
      </div>
    );
  }

  const content: RecipeContent = recipe.contentJson
    ? JSON.parse(recipe.contentJson)
    : { steps: [], description: recipe.description };

  const { ingredients, matchedCount, totalCount, matchScore } = matchRecipe(
    { components: isEditing ? draftIngredients.map((ingredient) => ingredient.title) : recipe.components },
    currentIngredients,
  );

  const overview = (
    <form
      aria-label={isEditing ? "Черновик рецепта" : undefined}
      onSubmit={(event) => event.preventDefault()}
      className={cn("flex min-w-0 flex-col [overflow-wrap:anywhere]", {
        "xl:pb-36": isEditing,
      })}
    >
      {isEditing ? (
        <PhotoEditor
          contextLabel="рецепта"
          downloadName="recipe-photo"
          imageUrl={imageField.value}
          imageFile={imageFileField.value}
          editing
          className="p-4"
          onChange={(file) => {
            imageFileField.onChange(file);
            if (!file) imageField.onChange("");
          }}
        />
      ) : (
        <div className="relative h-56 shrink-0 sm:h-[280px]">
          <ImageWithFallback
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
        </div>
      )}

      <div>
        <div className="px-7 pt-6 pb-4">
          {isEditing ? (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Название рецепта
                <Input {...register("title")} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Описание рецепта
                <Textarea {...register("description")} rows={5} />
              </label>
            </div>
          ) : (
            <>
              <h1 className="font-['Lora',serif] text-[26px] leading-tight font-semibold text-foreground">
                {recipe.title}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed mt-3">
                {content.description || recipe.description}
              </p>
            </>
          )}
        </div>

        <div className="mx-7 rounded-xl grid grid-cols-2 gap-2 p-4 bg-secondary mb-6">
          {[
            {
              icon: <Clock size={16} className="text-primary" />,
              label: "Время",
              field: "approximateTime" as const,
              value: recipe.approximateTime,
            },
            {
              icon: <Flame size={16} className="text-accent" />,
              label: "Калории",
              field: "calories" as const,
              value: `${recipe.calories}`,
            },
          ].map(({ icon, label, value, field }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              {icon}
              {isEditing ? (
                <label className="flex w-full flex-col items-center gap-1 text-xs text-muted-foreground">
                  {label}
                  <Input
                    variant="compact"
                    type={field === "calories" ? "number" : "text"}
                    min={field === "calories" ? 0 : undefined}
                    step={field === "calories" ? 1 : undefined}
                    {...register(
                      field,
                      field === "calories"
                        ? {
                            setValueAs: (value: string) =>
                              value === "" ? undefined : Number(value),
                          }
                        : {},
                    )}
                    className="text-center"
                  />
                </label>
              ) : (
                <>
                  <span className="text-[10px] text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-[13px] font-bold text-foreground">
                    {value}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="px-7 pb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-['Lora',serif] text-lg font-semibold text-foreground">
              Ингредиенты
            </h2>
            <span className="text-xs text-muted-foreground">
              <span className="text-primary font-semibold">{matchedCount}</span>
              /{totalCount} в кладовой
            </span>
          </div>
          {isEditing ? (
            <RecipeIngredientsEditor form={form} />
          ) : (
            <div className="flex flex-col gap-2">
              {ingredients.map(({ key, title, available: isInPantry }) => {
                return (
                  <div
                    key={key}
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
                      <span className="text-sm text-foreground">{title}</span>
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
          )}
        </div>
      </div>
    </form>
  );

  const instructions = (
    <div
      className={cn(
        "min-w-0 px-4 py-6 [overflow-wrap:anywhere] sm:px-8 sm:py-8",
        {
          "xl:pb-36": isEditing,
        },
      )}
    >
      <div className="max-w-2xl">
        <h2 className="font-['Lora',serif] text-[22px] font-semibold text-foreground mb-5">
          Инструкции
        </h2>

        {isEditing ? (
          <RecipeStepsEditor form={form} />
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {content.steps.map((step, idx) => {
                const done = completedSteps.has(idx);
                return (
                  <button
                    type="button"
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
          </>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "flex min-h-dvh min-w-0 flex-col bg-background xl:h-dvh xl:min-h-0 xl:overflow-hidden",
        {
          "pb-44 xl:pb-0": isEditing,
        },
      )}
    >
      {/* Верхняя панель */}
      <div className="sticky top-[var(--app-header-height,0rem)] z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-4 sm:px-8">
        <Link to="/recipes" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2">
          <ArrowLeft size={16} />
          Назад к рецептам
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {canManageRecipes && (
            <Button
              variant="primary"
              type="button"
              aria-pressed={isEditing}
              onClick={() => {
                if (!canManageRecipes || !accessToken) return;
                if (isEditing) {
                  cancelEditing();
                  return;
                }
                reset({
                  ...recipe,
                  imageFile: null,
                  components: recipe.components.map((title) => ({ title })),
                  steps: content.steps.map((step) => ({
                    stepTitle: step.stepTitle,
                    stepInstruction: step.stepInstruction,
                    imageUrl: step.imageUrl,
                    imageFile: null,
                  })),
                  description: content.description || recipe.description,
                });
                setEditingContext({ recipeSlug, accessToken });
              }}
            >
              {isEditing ? (
                <>
                  <X size={17} />
                  Выйти из режима редактирования
                </>
              ) : (
                <>
                  <Pencil size={17} />
                  Редактировать рецепт
                </>
              )}
            </Button>
          )}
          <span className="bg-primary text-white font-semibold text-sm px-3 py-1.5 rounded-full">
            {matchScore}% совпадение
          </span>
          <FavoriteButton
            recipe={{ ...recipe, slug: recipeSlug }}
            variant="detail"
          />
        </div>
      </div>

      <RecipePanels overview={overview} instructions={instructions} />
      {isEditing && <RecipeEditActions onCancel={cancelEditing} />}
    </div>
  );
}
