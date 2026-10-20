import { Heart, LoaderCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { favoritesApi } from "@/api/favorites/api";
import { useAuthStore } from "@/store/auth";
import type { Recipe } from "@/types/recipes";
import cn from "@/utils/classname-func";

interface FavoriteButtonProps {
  recipe: Recipe;
  variant?: "icon" | "detail" | "remove";
  className?: string;
}

export default function FavoriteButton({
  recipe,
  variant = "icon",
  className,
}: FavoriteButtonProps) {
  const userId = useAuthStore((state) => state.getUserId());
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const queryKey = ["favorites", userId];
  const mutationKey = ["favorite-toggle", userId, String(recipe.id)];

  const favorites = useQuery({
    queryKey,
    queryFn: () => {
      if (!userId) throw new Error("Необходим вход в аккаунт.");
      return favoritesApi.getAll(userId);
    },
    enabled: userId !== null,
    staleTime: 60 * 1000,
    retry: false,
  });

  const isFavorite =
    favorites.data?.recipes.some(
      (item) => String(item.id) === String(recipe.id),
    ) ?? false;

  const mutation = useMutation({
    mutationKey,
    mutationFn: () => {
      if (!userId) throw new Error("Необходим вход в аккаунт.");
      if (isFavorite) {
        return favoritesApi.remove(userId, recipe.id);
      }
      return favoritesApi.add(userId, recipe.id);
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey });
    },
  });

  const pendingMutations = useIsMutating({ mutationKey, exact: true });
  const loading = !!userId && (favorites.isPending || pendingMutations > 0);
  const error = mutation.error ?? favorites.error;
  const needsLogin =
    !userId ||
    (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0));

  let label = isFavorite ? "Удалить из избранного" : "Сохранить рецепт";
  if (needsLogin) {
    label = "Войдите, чтобы сохранить рецепт";
  } else if (favorites.isError) {
    label = "Повторить загрузку избранного";
  } else if (mutation.isError) {
    label = "Не удалось изменить избранное. Повторить";
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isFavorite}
      aria-busy={loading}
      title={label}
      disabled={loading}
      className={cn(
        "flex shrink-0 items-center justify-center gap-2 transition-colors disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2",
        {
          "h-9 w-9 rounded-full bg-secondary hover:bg-accent/10":
            variant === "icon",
          "rounded-xl border px-4 py-2 text-sm hover:opacity-90":
            variant === "detail",
          "border-accent bg-accent text-white":
            variant === "detail" && !isFavorite,
          "text-accent": isFavorite || variant === "remove",
          "border-accent/30 bg-accent/10": variant === "detail" && isFavorite,
          "w-full border-t px-4 py-3 text-xs hover:bg-accent/5":
            variant === "remove",
        },
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        if (needsLogin) {
          navigate({ to: "/auth/login" });
        } else if (favorites.isError) {
          favorites.refetch();
        } else {
          if (queryClient.isMutating({ mutationKey, exact: true })) return;
          mutation.mutate();
        }
      }}
    >
      {loading ? (
        <LoaderCircle size={17} className="animate-spin" />
      ) : favorites.isError || mutation.isError ? (
        <RefreshCw size={17} />
      ) : (
        <Heart size={17} fill={isFavorite ? "currentColor" : "none"} />
      )}
      {variant !== "icon" && (loading ? "Обновляем…" : label)}
    </button>
  );
}
