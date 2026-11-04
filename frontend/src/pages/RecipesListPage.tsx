import ResponsiveSidebar from "@/components/ui/ResponsiveSidebar";
import { normalizeIngredient } from "@/lib/ingredients";
import { recipesApi } from "@/api/recipes/api";
import { getApiError } from "@/api/errors";
import RecipeAccordionItem from "@/components/recipes/RecipeAccordionItem";
import Hint from "@/components/ui/Hint";
import Ingredient from "@/components/ui/Ingredient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CircleX, ScanLine, Sparkles, SlidersHorizontal } from "lucide-react";
import { Route as ScanRoute } from "@/routes/index";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import FormError from "@/components/ui/FormError";
import Button from "@/components/ui/Button";
import { useIngredientsStore } from "@/store/ingredients";

export function RecipesListPage() {
  const currentIngredients = useIngredientsStore(
    (state) => state.currentIngredients,
  );
  const setCurrentIngredients = useIngredientsStore(
    (state) => state.setCurrentIngredients,
  );

  const recognitionResult = useIngredientsStore((state) => state.recognitionResult);

  const queryKey = useMemo(
    () => ["recipes", [...currentIngredients].sort().join(",")],
    [currentIngredients],
  );

  const handleIngredientChange = (newIngredients: string[]) => {
    setCurrentIngredients(newIngredients);
  };

  const {
    data: searchResult,
    isError: isSearchError,
    isPending: isSearchPending,
    error: searchError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => recipesApi.findByIngredients(currentIngredients),
    enabled: recognitionResult === null && currentIngredients.length > 0,
    staleTime: 2 * 60 * 60 * 1000,
  });

  const recipes = recognitionResult ?? searchResult;
  const isRecipesError = recognitionResult === null && isSearchError;
  const isRecipesPending = recognitionResult === null && isSearchPending;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  const { register, handleSubmit, reset, setFocus, formState: { errors } } = useForm<{ ingredient: string }>({
    defaultValues: { ingredient: "" },
  });
  const [showIngForm, setShowIngForm] = useState(false);

  const handleAddIngredient = ({ ingredient }: { ingredient: string }) => {
    handleIngredientChange([...currentIngredients, ingredient]);
    setShowIngForm(false);
    reset();
  };

  const handleCancelAddIngredient = () => {
    setShowIngForm(false);
    reset();
  };

  const handleDeleteIngredient = (ing: string) => {
    if (currentIngredients == undefined) return;
    handleIngredientChange(currentIngredients.filter((item) => item != ing));
  };

  return (
    <div className="min-h-dvh">
      <button
        type="button"
        aria-label="Управлять ингредиентами"
        aria-expanded={filtersOpen}
        aria-controls="ingredient-filters"
        onClick={() => setFiltersOpen(true)}
        className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 lg:hidden"
      >
        <SlidersHorizontal size={20} />
        Ингредиенты
        <span className="rounded-full bg-white/20 px-2 text-sm">{currentIngredients.length}</span>
      </button>
      <div className="flex min-h-dvh items-start">
        <ResponsiveSidebar
          id="ingredient-filters"
          title="Ингредиенты"
          breakpoint="lg"
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          collapsed={filtersCollapsed}
          onCollapsedChange={setFiltersCollapsed}
          contentClassName="gap-5 px-5 py-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="text-xs text-accent" size={14} />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Сканирование
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {currentIngredients.length} ингредиентов обнаружено
            </p>

            <Hint
              text={`${recipes && recipes.recipeCount ? recipes.recipeCount : 0} подходящих рецептов найдено`}
              className="mt-1"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Ingredient
              title="+"
              className="text-xs!"
              onClick={() => {
                setShowIngForm(true);
                if (showIngForm) setFocus("ingredient");
              }}
            />
            {currentIngredients.map((ing) => (
              <Ingredient
                key={ing}
                title={ing}
                className="text-xs"
                onClick={() => handleDeleteIngredient(ing)}
                deletable
              />
            ))}
          </div>
          {showIngForm && (
            <form
              noValidate
              className="flex flex-col gap-4"
              onSubmit={handleSubmit(handleAddIngredient)}
            >
              <input
                autoFocus
                type="text"
                className="min-w-0 w-full border-b border-custom"
                {...register("ingredient", {
                  setValueAs: normalizeIngredient,
                  required: "Введите ингредиент",
                })}
                aria-invalid={!!errors.ingredient}
                aria-describedby={errors.ingredient ? "ingredient-error" : undefined}
                aria-label="Новый ингредиент"
                placeholder="Введите ингредиент"
              />
              <FormError id="ingredient-error" message={errors.ingredient?.message} />
              <div className="flex flex-row gap-4 justify-between">
                <Button
                  text="Добавить"
                  type="submit"
                  className="py-1!"
                />
                <Button
                  text="Отмена"
                  onClick={handleCancelAddIngredient}
                  variant="secondary"
                  className="py-1!"
                />
              </div>
            </form>
          )}

          <div className="h-px bg-border" />

          <Link
            to={ScanRoute.to}
            className="cursor-pointer bg-secondary text-foreground text-sm font-medium w-full py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-80"
          >
            <ScanLine size={15} />
            Сканировать заново
          </Link>
        </ResponsiveSidebar>

        <div className="min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:py-10">
          <h1 className="text-2xl text-foreground mb-2 sm:text-3xl">
            Предлагаемые рецепты
          </h1>

          <Hint
            text="Отсортированные по оценке совпадения ингредиентов - нажмите на рецепт для получения подробной информации"
            className="text-sm! mb-6"
          />
          {currentIngredients.length > 0 && isRecipesPending && (
            <p role="status" className="py-8 text-muted-foreground">
              Загружаем рецепты…
            </p>
          )}
          {isRecipesError && (
            <div role="alert" className="py-8">
              <p className="mb-4">{getApiError(searchError, "Не удалось загрузить рецепты.").message}</p>
              <Button
                text="Повторить поиск"
                onClick={() => {
                  refetch();
                }}
              />
            </div>
          )}
          {recipes?.recipes.map((recipe) => (
            <RecipeAccordionItem
              key={recipe.id}
              recipe={recipe}
              currentIngredients={currentIngredients}
            />
          ))}
          {(currentIngredients.length === 0 ||
            (!isRecipesError &&
              !isRecipesPending &&
              recipes?.recipeCount === 0)) && (
            <div className="flex justify-center items-center">
              <div className="w-fit bg-card p-8 rounded-2xl border border-custom flex justify-center items-center gap-4 flex-col">
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-secondary">
                  <CircleX size={34} className="text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-semibold">
                    Рецепты не найдены
                  </p>
                  <Hint
                    text={
                      currentIngredients.length == 0
                        ? "Не удалось распознать продукты на фотографии. Добавьте их вручную либо сфотографируйте их заново"
                        : "Для данных продуктов не получилось найти подходящие рецепты"
                    }
                    className="text-sm! mt-2"
                  />
                </div>
                <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    text="Добавить ингредиенты"
                    variant="primary"
                    onClick={() => {
                      setFiltersCollapsed(false);
                      setFiltersOpen(true);
                      setShowIngForm(true);
                    }}
                  />
                  <Link to={ScanRoute.to} className="w-full rounded-xl">
                    <Button
                      text="Сканировать заново"
                      variant="secondary"
                      nofocus
                    />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
