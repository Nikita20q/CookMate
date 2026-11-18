import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, LoaderCircle } from "lucide-react";
import { recipesApi } from "@/api/recipes/api";
import { archivedRecipesKey, managedRecipeKey, managedRecipeToDetail, type ManagedRecipePage, type ManagedRecipeResponse, type RecipeStatusRequest } from "@/api/recipes/management";
import { getApiError } from "@/api/errors";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FormError from "@/components/ui/FormError";
import { useAuthStore } from "@/store/auth";
import { useIngredientsStore } from "@/store/ingredients";
import type { Recipe, RecipeDetail } from "@/types/recipes";
import type { RecognizeResponse } from "@/api/recipes/types";

interface Props {
  recipe: RecipeDetail;
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
  initialData?: ManagedRecipeResponse;
}

export default function ArchiveRecipeButton({ recipe, disabled = false, onPendingChange, initialData }: Props) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [nextArchived, setNextArchived] = useState<boolean | null>(null);
  const closeConfirmation = useCallback(() => setNextArchived(null), []);
  const queryKey = managedRecipeKey(accessToken, recipe.id);
  const managed = useQuery({
    queryKey,
    queryFn: () => recipesApi.getManagedRecipe(recipe.id),
    enabled: accessToken !== null,
    staleTime: 30_000,
    retry: false,
    initialData,
  });
  const isArchived = managed.data?.archived === true;

  const archive = useMutation({
    mutationFn: (request: RecipeStatusRequest) => {
      if (!accessToken || disabled || !managed.data) throw new Error("Не удалось получить актуальный статус рецепта.");
      return recipesApi.setRecipeStatus(recipe.id, request);
    },
    onSuccess: async (saved) => {
      await queryClient.cancelQueries({ predicate: ({ queryKey: key, state }) =>
        ((key[0] === "recipes" || key[0] === "favorites") && (!state.data || typeof state.data === "object" && "recipes" in state.data)) ||
        (key[0] === "recipes" && key[1] === saved.recipe.slug),
      });
      await queryClient.cancelQueries({ queryKey: archivedRecipesKey(accessToken) });
      // A request from the previous account must not recreate its private cache.
      if (useAuthStore.getState().accessToken === accessToken) queryClient.setQueryData(queryKey, saved);
      const updated = managedRecipeToDetail(saved);
      queryClient.setQueryData(["recipes", saved.recipe.slug], updated);
      queryClient.setQueriesData<RecognizeResponse>({ predicate: ({ queryKey: key, state }) =>
        key[0] === "recipes" && !!state.data && typeof state.data === "object" && "recipes" in state.data,
      }, (current) => {
        if (!current) return current;
        const recipes = saved.archived
          ? current.recipes.filter((item) => String(item.id) !== String(saved.id))
          : current.recipes.map((item) => String(item.id) === String(saved.id) ? { ...item, ...updated } : item);
        return { ...current, recipes, recipeCount: Math.max(0, current.recipeCount - (current.recipes.length - recipes.length)) };
      });
      if (!saved.archived) queryClient.setQueriesData<{ recipes: Recipe[] }>({
        predicate: ({ queryKey: key, state }) => key[0] === "favorites" && !!state.data && typeof state.data === "object" && "recipes" in state.data,
      }, (current) => current && ({ ...current, recipes: current.recipes.map((item) =>
        String(item.id) === String(saved.id) ? { ...item, ...updated } : item) }));
      if (useAuthStore.getState().accessToken === accessToken) {
        const recognized = useIngredientsStore.getState().recognitionResult;
        if (recognized && saved.archived) {
          const recipes = recognized.recipes.filter((item) => String(item.id) !== String(saved.id));
          useIngredientsStore.getState().setRecognitionResult({ ...recognized, recipes, recipeCount: recipes.length });
        } else if (recognized) {
          // Re-run the search using the current ingredients; the restored recipe may now match.
          useIngredientsStore.setState({ recognitionResult: null });
        }
        if (!saved.archived) queryClient.setQueriesData<ManagedRecipePage>({ queryKey: archivedRecipesKey(accessToken) },
          (current) => current && ({
            ...current,
            recipes: current.recipes.filter((item) => item.id !== saved.id),
            total: Math.max(0, current.total - 1),
          }));
      }
      if (!saved.archived) {
        await queryClient.invalidateQueries({ predicate: ({ queryKey: key, state }) =>
          key[0] === "recipes" && (!state.data || typeof state.data === "object" && "recipes" in state.data),
        });
      }
      await queryClient.invalidateQueries({ queryKey: archivedRecipesKey(accessToken) });
    },
    onError: (error) => {
      if (getApiError(error).status === 409) {
        void managed.refetch();
        void queryClient.invalidateQueries({ queryKey: archivedRecipesKey(accessToken) });
      }
    },
  });

  useEffect(() => {
    onPendingChange?.(archive.isPending);
    return () => onPendingChange?.(false);
  }, [archive.isPending, onPendingChange]);

  return (
    <div className="flex max-w-sm flex-col gap-2">
      <Button
        variant="outline"
        disabled={disabled || managed.isFetching || managed.isPending || archive.isPending}
        aria-busy={managed.isFetching || archive.isPending}
        onClick={() => {
          if (managed.isError) { void managed.refetch(); return; }
          archive.reset();
          setNextArchived(!isArchived);
        }}
      >
        {archive.isPending ? <LoaderCircle size={17} className="animate-spin" /> : isArchived ? <ArchiveRestore size={17} /> : <Archive size={17} />}
        {archive.isPending ? archive.variables?.archived ? "Архивируем…" : "Возвращаем…" : managed.isError ? "Повторить загрузку статуса" : isArchived ? "Вернуть из архива" : "Архивировать рецепт"}
      </Button>
      <FormError message={archive.isError ? getApiError(archive.error, "Не удалось изменить статус рецепта.").message : managed.isError ? `Статус рецепта: ${getApiError(managed.error, "Не удалось загрузить статус рецепта.").message}` : undefined} />
      {nextArchived !== null && !disabled && (
        <ConfirmDialog
          title={nextArchived ? "Архивировать рецепт?" : "Вернуть рецепт из архива?"}
          description={nextArchived
            ? `«${recipe.title}» будет перемещён в архив и перестанет отображаться в подборе рецептов.`
            : `«${recipe.title}» снова будет доступен в подборе рецептов.`}
          confirmLabel={nextArchived ? "В архив" : "Вернуть рецепт"}
          cancelLabel="Отмена"
          onCancel={closeConfirmation}
          onConfirm={() => {
            if (archive.isPending || !managed.data || disabled) return;
            archive.mutate({ version: managed.data.version, archived: nextArchived });
            setNextArchived(null);
          }}
        />
      )}
    </div>
  );
}
