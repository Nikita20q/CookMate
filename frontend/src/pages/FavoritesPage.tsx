import { Link } from "@tanstack/react-router";
import { ChefHat, Heart, LoaderCircle, RefreshCw } from "lucide-react";
import { isAxiosError } from "axios";
import FavoriteRecipeCard from "@/components/recipes/FavoriteRecipeCard";
import { useQuery } from "@tanstack/react-query";
import { favoritesApi } from "@/api/favorites/api";
import { useAuthStore } from "@/store/auth";
import { useIngredientsStore } from "@/store/ingredients";

const linkClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2";

export default function FavoritesPage() {
  const userId = useAuthStore((state) => state.getUserId());
  const favorites = useQuery({
    queryKey: ["favorites", userId],
    queryFn: () => {
      if (!userId) throw new Error("Необходим вход в аккаунт.");
      return favoritesApi.getAll(userId);
    },
    enabled: userId !== null,
    staleTime: 60 * 1000,
    retry: false,
  });
  const currentIngredients = useIngredientsStore(
    (state) => state.currentIngredients,
  );
  const needsLogin = !userId;
  const forbidden =
    isAxiosError(favorites.error) && favorites.error.response?.status === 403;

  return (
    <div className="mx-auto max-w-[1040px] px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p
            className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <Heart size={15} className="text-accent" fill="currentColor" />
            {userId && favorites.data
              ? `Сохранено: ${favorites.data.recipeNumber}`
              : "Ваша коллекция"}
          </p>
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
            Избранные рецепты
          </h1>
        </div>
        <Link to="/recipes" className={linkClass}>
          <ChefHat size={17} />
          Найти ещё рецепты
        </Link>
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
          <Link to="/auth/login" search={{ returnTo: "/favorites" }} className={linkClass}>
            Войти в аккаунт
          </Link>
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
            {forbidden
              ? "У вас нет прав для просмотра этой коллекции."
              : "Проверьте подключение и попробуйте снова."}
          </p>
          {!forbidden && (
            <button
              type="button"
              className={linkClass}
              disabled={favorites.isFetching}
              onClick={() => void favorites.refetch()}
            >
              <RefreshCw
                size={16}
                className={favorites.isFetching ? "animate-spin" : ""}
              />
              Повторить
            </button>
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
          <Link to="/recipes" className={linkClass}>
            <ChefHat size={17} />
            Подобрать рецепты
          </Link>
        </div>
      )}
    </div>
  );
}
