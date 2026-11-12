import { act, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "@/api/auth/api";
import { favoritesApi } from "@/api/favorites/api";
import { recipesApi } from "@/api/recipes/api";
import { useAuthStore } from "@/store/auth";
import { detail, recipe, token } from "./fixtures";
import { renderApp } from "./helpers";

beforeEach(() => {
  useAuthStore.getState().setAccessToken(token());
  vi.spyOn(authApi, "me").mockResolvedValue({ userId: 1, email: "admin@example.com", isStaff: true });
  vi.spyOn(favoritesApi, "getAll").mockResolvedValue({ recipeNumber: 0, recipes: [] });
  vi.spyOn(recipesApi, "getBySlug").mockResolvedValue(detail);
  let preview = 0;
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => `blob:step-preview-${++preview}`);
    static revokeObjectURL = vi.fn();
  });
});

async function openEditor() {
  const app = await renderApp(`/recipes/${recipe.slug}`);
  await app.user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
  return app;
}

function stepsList() {
  return within(screen.getByRole("list", { name: "Шаги инструкции" }));
}

describe("Редактор шагов инструкции", () => {
  it("редактирует многострочный текст без обязательной фотографии и откатывает общий черновик", async () => {
    const { user, client } = await openEditor();
    expect(stepsList().getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText("0/2 шагов выполнено")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Редактировать шаг 1" }));
    const textarea = screen.getByRole("textbox", { name: "Текст шага 1" });
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveFocus();
    expect(screen.getByRole("button", { name: "Добавить фотографию шага 1" })).toBeVisible();
    await user.clear(textarea);
    await user.click(screen.getByRole("button", { name: "Применить изменения шага 1" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Введите текст инструкции");
    await user.type(textarea, "Разбейте яйца{Enter}Перемешайте");
    expect(textarea).toHaveValue("Разбейте яйца\nПеремешайте");
    await user.click(screen.getByRole("button", { name: "Применить изменения шага 1" }));
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Текст шага 1" })).not.toBeInTheDocument());
    expect(stepsList().getByText(/Разбейте яйца/)).toHaveTextContent("Перемешайте");
    expect(client.getQueryData(["recipes", recipe.slug])).toEqual(detail);
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    expect(screen.getByRole("button", { name: /Взбейте яйца/ })).toBeVisible();
  });

  it("показывает действия фотографии, удаляет её и восстанавливает при отмене шага", async () => {
    const { user } = await openEditor();
    await user.click(screen.getByRole("button", { name: "Редактировать шаг 2" }));
    expect(screen.getByRole("img", { name: "Фотография шага 2" })).toHaveAttribute("src", "/step.jpg");
    expect(screen.getByRole("button", { name: "Скачать фотографию шага 2" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Заменить фотографию шага 2" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Удалить фотографию шага 2" }));
    expect(screen.queryByRole("img", { name: "Фотография шага 2" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить фотографию шага 2" })).toBeVisible();
    await user.clear(screen.getByRole("textbox", { name: "Текст шага 2" }));
    await user.type(screen.getByRole("textbox", { name: "Текст шага 2" }), "Другой текст");
    await user.click(screen.getByRole("button", { name: "Отменить изменения шага 2" }));
    expect(stepsList().getByText("Добавьте сыр и обжарьте омлет")).toBeVisible();
    expect(screen.getByRole("img", { name: "Фотография шага 2" })).toHaveAttribute("src", "/step.jpg");
  });

  it("показывает только одно локальное фото, заменяет его и освобождает предпросмотр", async () => {
    const { user, client } = await openEditor();
    await user.click(screen.getByRole("button", { name: "Редактировать шаг 1" }));
    const fileInput = screen.getByLabelText("Фотография шага 1");
    expect(fileInput).not.toHaveAttribute("multiple");
    await user.upload(fileInput, new File(["photo"], "one.png", { type: "image/png" }));
    const firstUrl = screen.getByRole("img", { name: "Фотография шага 1" }).getAttribute("src");
    expect(firstUrl).toMatch(/^blob:/);
    expect(screen.queryByRole("button", { name: "Добавить фотографию шага 1" })).not.toBeInTheDocument();
    const download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await user.click(screen.getByRole("button", { name: "Скачать фотографию шага 1" }));
    expect(download).toHaveBeenCalledOnce();
    await user.upload(fileInput, new File(["replacement"], "two.png", { type: "image/png" }));
    expect(screen.getAllByRole("img", { name: "Фотография шага 1" })).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Фотография шага 1" })).not.toHaveAttribute("src", firstUrl);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
    await user.click(screen.getByRole("button", { name: "Применить изменения шага 1" }));
    expect(screen.getByRole("img", { name: "Фотография шага 1" })).toBeVisible();
    expect(client.getQueryData(["recipes", recipe.slug])).toEqual(detail);
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(screen.queryByRole("img", { name: "Фотография шага 1" })).not.toBeInTheDocument();
  });

  it("добавляет шаг в конец, удаляет шаги и обновляет нумерацию", async () => {
    const { user } = await openEditor();
    await user.click(screen.getByRole("button", { name: "Добавить шаг" }));
    const textarea = screen.getByRole("textbox", { name: "Текст шага 3" });
    expect(textarea).toHaveFocus();
    await user.type(textarea, "Подавайте горячим");
    await user.click(screen.getByRole("button", { name: "Применить изменения шага 3" }));
    await user.click(screen.getByRole("button", { name: "Удалить шаг 1" }));
    expect(stepsList().getAllByRole("heading").map((heading) => heading.textContent)).toEqual(["Шаг 1", "Шаг 2"]);
    expect(stepsList().getAllByRole("listitem")[1]).toHaveTextContent("Подавайте горячим");
    await user.click(screen.getByRole("button", { name: "Добавить шаг" }));
    await user.click(screen.getByRole("button", { name: "Отменить изменения шага 3" }));
    expect(stepsList().getAllByRole("listitem")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Удалить шаг 1" }));
    await user.click(screen.getByRole("button", { name: "Удалить шаг 1" }));
    expect(screen.getByText("В рецепте нет шагов инструкции.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Добавить шаг" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(stepsList().getAllByRole("listitem")).toHaveLength(2);
  });

  it("перемещает текст и фотографию вместе по вертикали", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const list = this.tagName === "OL" ? this : this.parentElement;
      if (list?.getAttribute("aria-label") === "Шаги инструкции") {
        const index = [...list.children].indexOf(this);
        return new DOMRect(0, index < 0 ? 0 : index * 200, 600, index < 0 ? list.children.length * 200 : 188);
      }
      return new DOMRect(0, 0, 600, 600);
    });
    const { user } = await openEditor();
    const handle = screen.getByRole("button", { name: "Переместить шаг 2" });
    act(() => handle.focus());
    await user.keyboard(" {ArrowLeft}{ArrowUp}{ArrowUp}");
    expect(handle.closest("li")?.style.transform).toMatch(/^translate3d\(0px,/);
    await user.keyboard(" ");
    await waitFor(() => expect(stepsList().getAllByRole("listitem")[0]).toHaveTextContent("Добавьте сыр и обжарьте омлет"));
    const first = within(stepsList().getAllByRole("listitem")[0]);
    expect(first.getByRole("heading", { name: "Шаг 1" })).toBeVisible();
    expect(first.getByRole("img", { name: "Фотография шага 1" })).toHaveAttribute("src", "/step.jpg");
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(stepsList().getAllByRole("listitem")[0]).toHaveTextContent("Взбейте яйца");
  });
});
