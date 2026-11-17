import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, LoaderCircle } from "lucide-react";
import { recipesApi } from "@/api/recipes/api";
import { archivedRecipesKey, managedRecipeKey, managedRecipeToDetail } from "@/api/recipes/management";
import { getApiError } from "@/api/errors";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FormError from "@/components/ui/FormError";
import { useAuthStore } from "@/store/auth";
import { useIngredientsStore } from "@/store/ingredients";
import type { RecipeDetail } from "@/types/recipes";
import type { RecognizeResponse } from "@/api/recipes/types";

interface Props {
  recipe: RecipeDetail;
  disabled: boolean;
  onPendingChange: (pending: boolean) => void;
}

export default function ArchiveRecipeButton({ recipe, disabled, onPendingChange }: Props) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const closeConfirmation = useCallback(() => setConfirmOpen(false), []);
  const queryKey = managedRecipeKey(accessToken, recipe.id);
  const managed = useQuery({
    queryKey,
    queryFn: () => recipesApi.getManagedRecipe(recipe.id),
    enabled: accessToken !== null,
    staleTime: 30_000,
    retry: false,
  });

  const archive = useMutation({
    mutationFn: () => {
      if (!accessToken || disabled || !managed.data) throw new Error("Не удалось получить актуальный статус рецепта.");
      return recipesApi.setRecipeStatus(recipe.id, { version: managed.data.version, archived: true });
    },
    onSuccess: async (saved) => {
      await queryClient.cancelQueries({ predicate: ({ queryKey: key, state }) =>
        (key[0] === "recipes" && !!state.data && typeof state.data === "object" && "recipes" in state.data) ||
        (key[0] === "recipes" && key[1] === saved.recipe.slug),
      });
      // A request from the previous account must not recreate its private cache.
      if (useAuthStore.getState().accessToken === accessToken) queryClient.setQueryData(queryKey, saved);
      queryClient.setQueryData(["recipes", saved.recipe.slug], managedRecipeToDetail(saved));
      queryClient.setQueriesData<RecognizeResponse>({ predicate: ({ queryKey: key, state }) =>
        key[0] === "recipes" && !!state.data && typeof state.data === "object" && "recipes" in state.data,
      }, (current) => {
        if (!current) return current;
        const recipes = current.recipes.filter((item) => String(item.id) !== String(saved.id));
        return { ...current, recipes, recipeCount: Math.max(0, current.recipeCount - (current.recipes.length - recipes.length)) };
      });
      const recognized = useIngredientsStore.getState().recognitionResult;
      if (recognized) {
        const recipes = recognized.recipes.filter((item) => String(item.id) !== String(saved.id));
        useIngredientsStore.getState().setRecognitionResult({ ...recognized, recipes, recipeCount: recipes.length });
      }
      await queryClient.invalidateQueries({ queryKey: archivedRecipesKey(accessToken) });
    },
    onError: (error) => {
      if (getApiError(error).status === 409) void managed.refetch();
    },
  });

  useEffect(() => {
    onPendingChange(archive.isPending);
    return () => onPendingChange(false);
  }, [archive.isPending, onPendingChange]);

  if (managed.data?.archived) {
    return <span role="status" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground"><Archive size={17} />Рецепт в архиве</span>;
  }

  return (
    <div className="flex max-w-sm flex-col gap-2">
      <Button
        variant="outline"
        disabled={disabled || managed.isFetching || managed.isPending || archive.isPending}
        aria-busy={managed.isFetching || archive.isPending}
        onClick={() => {
          if (managed.isError) { void managed.refetch(); return; }
          archive.reset();
          setConfirmOpen(true);
        }}
      >
        {archive.isPending ? <LoaderCircle size={17} className="animate-spin" /> : <Archive size={17} />}
        {archive.isPending ? "Архивируем…" : managed.isError ? "Повторить загрузку статуса" : "Архивировать рецепт"}
      </Button>
      <FormError message={archive.isError ? getApiError(archive.error, "Не удалось архивировать рецепт.").message : managed.isError ? `Статус рецепта: ${getApiError(managed.error, "Не удалось загрузить статус рецепта.").message}` : undefined} />
      {confirmOpen && !disabled && (
        <ConfirmDialog
          title="Архивировать рецепт?"
          description={`«${recipe.title}» будет перемещён в архив и перестанет отображаться в подборе рецептов.`}
          confirmLabel="В архив"
          cancelLabel="Отмена"
          onCancel={closeConfirmation}
          onConfirm={() => {
            if (archive.isPending || !managed.data || disabled) return;
            setConfirmOpen(false);
            archive.mutate();
          }}
        />
      )}
    </div>
  );
}
