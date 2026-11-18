import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { recipesApi } from "@/api/recipes/api";
import { archivedRecipesKey, managedRecipeToDetail } from "@/api/recipes/management";
import ArchiveRecipeButton from "@/components/recipes/ArchiveRecipeButton";
import { getApiError } from "@/api/errors";
import Button from "@/components/ui/Button";
import ButtonLink from "@/components/ui/ButtonLink";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthStore } from "@/store/auth";

const PAGE_SIZE = 20;

export default function ArchivedRecipesPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const profile = useCurrentUser();
  const [page, setPage] = useState(0);
  const archive = useQuery({
    queryKey: [...archivedRecipesKey(accessToken), page],
    queryFn: () => recipesApi.getArchivedRecipes(page, PAGE_SIZE),
    enabled: profile.canManageRecipes,
    retry: false,
  });
  const lastPage = archive.data ? Math.max(0, Math.ceil(archive.data.total / PAGE_SIZE) - 1) : page;
  if (page > lastPage) setPage(lastPage);

  const header = (
    <header className="mb-8 flex items-center gap-3">
      <Archive size={28} className="text-primary" />
      <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Архив рецептов</h1>
    </header>
  );

  let content;
  if (!accessToken) {
    content = <div className="space-y-4"><p>Войдите в аккаунт администратора, чтобы просмотреть архив.</p><ButtonLink to="/auth/login" search={{ returnTo: "/recipes/archive" }}>Войти в аккаунт</ButtonLink></div>;
  } else if (profile.isPending) {
    content = <p role="status">Проверяем права доступа…</p>;
  } else if (profile.isError) {
    content = <div role="alert" className="space-y-4"><p>{getApiError(profile.error, "Не удалось проверить права доступа.").message}</p><Button onClick={() => void profile.refetch()}>Повторить проверку</Button></div>;
  } else if (!profile.canManageRecipes) {
    content = <p role="alert">Архив доступен только администраторам.</p>;
  } else if (archive.isPending) {
    content = <div role="status" className="flex items-center gap-3 py-12 text-muted-foreground"><LoaderCircle size={22} className="animate-spin" />Загружаем архив…</div>;
  } else if (archive.isError) {
    content = <div role="alert" className="space-y-4"><p>{getApiError(archive.error, "Не удалось загрузить архив рецептов.").message}</p><Button disabled={archive.isFetching} onClick={() => void archive.refetch()}>Повторить загрузку</Button></div>;
  } else {
    const totalPages = Math.max(1, Math.ceil(archive.data.total / PAGE_SIZE));
    content = (
      <>
        <p className="mb-5 text-sm text-muted-foreground">В архиве: {archive.data.total}</p>
        {archive.data.recipes.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {archive.data.recipes.map((managedRecipe) => {
              const { id, recipe } = managedRecipe;
              return (
              <article key={id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card">
                <ImageWithFallback src={recipe.imageUrl ?? undefined} alt={recipe.title} className="h-44 w-full object-cover" />
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h2 className="font-serif text-xl font-semibold [overflow-wrap:anywhere]">{recipe.title}</h2>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{recipe.description || "Без описания"}</p>
                  <ButtonLink to="/recipes/$acronym" params={{ acronym: recipe.slug }} variant="secondary" className="mt-auto" aria-label={`Открыть рецепт ${recipe.title}`}>Открыть рецепт</ButtonLink>
                  <ArchiveRecipeButton recipe={managedRecipeToDetail(managedRecipe)} initialData={managedRecipe} />
                </div>
              </article>
              );
            })}
          </div>
        ) : <p className="rounded-2xl border bg-card px-6 py-16 text-center text-muted-foreground">В архиве пока нет рецептов.</p>}
        {totalPages > 1 && (
          <nav aria-label="Страницы архива" className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Button variant="secondary" disabled={page === 0 || archive.isFetching} onClick={() => setPage((value) => value - 1)}><ArrowLeft size={16} />Назад</Button>
            <span aria-live="polite" className="text-sm text-muted-foreground">Страница {page + 1} из {totalPages}</span>
            <Button variant="secondary" disabled={page + 1 >= totalPages || archive.isFetching} onClick={() => setPage((value) => value + 1)}>Далее<ArrowRight size={16} /></Button>
          </nav>
        )}
      </>
    );
  }

  return <div className="mx-auto max-w-[1040px] px-4 py-8 sm:px-8 sm:py-10">{header}{content}</div>;
}
