import { act, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { recipesApi } from "@/api/recipes/api";
import { useIngredientsStore } from "@/store/ingredients";

const clients: QueryClient[] = [];

export async function renderApp(path: string) {
  vi.spyOn(recipesApi, "getSearchHistory").mockResolvedValue([
    {
      id: 1,
      createdAt: "2026-10-20",
      ingredients: useIngredientsStore.getState().currentIngredients,
    },
  ]);
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  clients.push(client);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await act(async () => {
    await router.load();
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  });
  return { client, router, user: userEvent.setup() };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
});
