import Button from "@/components/ui/Button";
import ButtonLink from "@/components/ui/ButtonLink";
import { ChefHat, Heart, LoaderCircle, RefreshCw } from "lucide-react";
import { getApiError } from "@/api/errors";
import FavoriteRecipeCard from "@/components/recipes/FavoriteRecipeCard";
import { useQuery } from "@tanstack/react-query";
import { favoritesApi } from "@/api/favorites/api";
import { useAuthStore } from "@/store/auth";
import { useIngredientsStore } from "@/store/ingredients";

export default function FavoritesPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const favorites = useQuery({
    queryKey: ["favorites", accessToken],
    queryFn: () => favoritesApi.getAll(),
    enabled: accessToken !== null,
    staleTime: 60 * 1000,
    retry: false,
  });
  const currentIngredients = useIngredientsStore(
    (state) => state.currentIngredients,
  );
  const needsLogin = !accessToken;
  const apiError = getApiError(favorites.error, "Проверьте подключение и попробуйте снова.");
  const forbidden = apiError.status === 403;

  return (
    <div className="mx-auto max-w-[1040px] px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p
            className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <Heart size={15} className="text-accent" fill="currentColor" />
            {accessToken && favorites.data
              ? `Сохранено: ${favorites.data.recipeNumber}`
              : "Ваша коллекция"}
          </p>
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
            Избранные рецепты
          </h1>
        </div>
        <ButtonLink variant="secondary" to="/recipes" className="w-fit">
          <ChefHat size={17} />
          Найти ещё рецепты
        </ButtonLink>
      </header>

      {needsLogin ? (
        <div className="rounded-2xl border bg-card px-6 py-16 text-center">
          <Heart size={36} className="mx-auto mb-5 text-accent" />
          <h2 className="mb-2 text-xl font-semibold">
            Сохраняйте любимые рецепты
          </h2>
          <p className="mx-auto mb-6 max-w-sm text-sm text-muted-foreground">
            Войдите в аккаунт, чтобы добавлять рецепты в избранное и
            возвращаться к ним в любое время.
          </p>
          <ButtonLink variant="secondary" to="/auth/login" search={{ returnTo: "/favorites" }} className="w-fit">
            Войти в аккаунт
          </ButtonLink>
        </div>
      ) : favorites.isPending ? (
        <div
          role="status"
          className="flex items-center justify-center gap-3 py-24 text-muted-foreground"
        >
          <LoaderCircle size={22} className="animate-spin" />
          Загружаем избранное…
        </div>
      ) : favorites.isError ? (
        <div
          role="alert"
          className="rounded-2xl border bg-card px-6 py-16 text-center"
        >
          <h2 className="mb-2 text-xl font-semibold">
            {forbidden
              ? "Нет доступа к избранному"
              : "Не удалось загрузить избранное"}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {apiError.message}
          </p>
          {!forbidden && (
            <Button
              variant="secondary"
              type="button"
              className="w-auto"
              disabled={favorites.isFetching}
              onClick={() => void favorites.refetch()}
            >
              <RefreshCw
                size={16}
                className={favorites.isFetching ? "animate-spin" : ""}
              />
              Повторить
            </Button>
          )}
        </div>
      ) : favorites.data?.recipes.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.data.recipes.map((recipe) => (
            <FavoriteRecipeCard
              key={recipe.id}
              recipe={recipe}
              currentIngredients={currentIngredients}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-card px-6 py-16 text-center">
          <Heart size={36} className="mx-auto mb-5 text-accent" />
          <h2 className="mb-2 text-xl font-semibold">
            Здесь будут ваши любимые рецепты
          </h2>
          <p className="mx-auto mb-6 max-w-sm text-sm text-muted-foreground">
            Нажмите на сердечко в списке рецептов или на странице блюда, чтобы
            сохранить его здесь.
          </p>
          <ButtonLink variant="secondary" to="/recipes" className="w-fit">
            <ChefHat size={17} />
            Подобрать рецепты
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
