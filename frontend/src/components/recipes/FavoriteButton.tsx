import Button from "@/components/ui/Button";
import ActionButton from "@/components/ui/ActionButton";
import { Heart, LoaderCircle, RefreshCw } from "lucide-react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getApiError } from "@/api/errors";
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
  const accessToken = useAuthStore((state) => state.accessToken);
  const navigate = useNavigate();
  const { href } = useLocation();
  const queryClient = useQueryClient();
  const queryKey = ["favorites", accessToken];
  const mutationKey = ["favorite-toggle", accessToken, String(recipe.id)];

  const favorites = useQuery({
    queryKey,
    queryFn: () => favoritesApi.getAll(),
    enabled: accessToken !== null,
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
      if (!accessToken) throw new Error("Необходим вход в аккаунт.");
      if (isFavorite) {
        return favoritesApi.remove(recipe.id);
      }
      return favoritesApi.add(recipe.id);
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey });
    },
  });

  const pendingMutations = useIsMutating({ mutationKey, exact: true });
  const loading = !!accessToken && (favorites.isPending || pendingMutations > 0);
  const error = mutation.error ?? favorites.error;
  const needsLogin = !accessToken;
  const apiError = getApiError(error, "Не удалось изменить избранное.");
  const forbidden = apiError.status === 403;

  let label = isFavorite ? "Удалить из избранного" : "Сохранить рецепт";
  if (needsLogin) {
    label = "Войдите, чтобы сохранить рецепт";
  } else if (forbidden) {
    label = apiError.message;
  } else if (favorites.isError) {
    label = `${apiError.message} — повторить загрузку избранного`;
  } else if (mutation.isError) {
    label = `${apiError.message} — повторить`;
  }

  const Control = variant === "icon" ? ActionButton : Button;

  return (
    <Control
      variant="favorite"
      type="button"
      aria-label={label}
      aria-pressed={isFavorite}
      aria-busy={loading}
      title={label}
      disabled={loading || forbidden}
      className={cn(
        {
          "w-full": variant === "remove",
        },
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        if (needsLogin) {
          navigate({ to: "/auth/login", search: { returnTo: href } });
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
    </Control>
  );
}
