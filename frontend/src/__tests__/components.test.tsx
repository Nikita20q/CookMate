import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import userEvent from "@testing-library/user-event";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import Button from "@/components/ui/Button";
import ActionButton from "@/components/ui/ActionButton";
import Ingredient from "@/components/ui/Ingredient";
import RecipePanels from "@/components/recipes/RecipePanels";

describe("Общие компоненты", () => {
  it("передаёт ref, HTML-пропсы и содержимое в нативную кнопку", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <ActionButton ref={ref} aria-label="Настройки" aria-pressed name="action" value="settings">
        <span aria-hidden="true">⚙</span>
      </ActionButton>,
    );
    const button = screen.getByRole("button", { name: "Настройки" });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("name", "action");
    expect(button).toHaveAttribute("value", "settings");
  });

  it("активирует кнопку ингредиента клавишами Enter и пробелом", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Ingredient title="сыр" onClick={onClick} deletable />);
    await user.tab();
    expect(screen.getByRole("button", { name: "сыр" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("вызывает действие доступной кнопки", () => {
    const onClick = vi.fn();
    render(<Button text="Добавить" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("не вызывает действие заблокированной кнопки", () => {
    const onClick = vi.fn();
    render(<Button text="Добавить" disabled onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("заменяет недоступную фотографию заглушкой", () => {
    render(<ImageWithFallback src="/missing.jpg" alt="Омлет" />);
    fireEvent.error(screen.getByRole("img", { name: "Омлет" }));
    expect(
      screen.getByRole("img", { name: "Error loading image" }),
    ).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml"));
  });
});

describe("Адаптивные панели рецепта", () => {
  it("располагает инструкции после ингредиентов на узком экране", () => {
    render(
      <RecipePanels
        overview={<h2>Ингредиенты</h2>}
        instructions={<h2>Инструкции</h2>}
      />,
    );
    const regions = screen.getAllByRole("region");
    expect(regions[0]).toHaveAccessibleName("Информация о рецепте");
    expect(regions[1]).toHaveAccessibleName("Инструкции приготовления");
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("переключает панели при изменении ширины окна", () => {
    let listener: (() => void) | undefined;
    const query = {
      matches: false,
      media: "(min-width: 80rem)",
      addEventListener: vi.fn((_event: string, callback: () => void) => {
        listener = callback;
      }),
      removeEventListener: vi.fn(),
    };
    vi.mocked(window.matchMedia).mockReturnValue(
      query as unknown as MediaQueryList,
    );
    render(
      <RecipePanels
        overview={<h2>Ингредиенты</h2>}
        instructions={<h2>Инструкции</h2>}
      />,
    );
    act(() => {
      query.matches = true;
      listener?.();
    });
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Информация о рецепте" }),
    ).toHaveAttribute("tabindex", "0");
    expect(
      screen.getByRole("region", { name: "Инструкции приготовления" }),
    ).toHaveAttribute("tabindex", "0");
    act(() => {
      query.matches = false;
      listener?.();
    });
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    expect(screen.getByText("Ингредиенты")).toBeVisible();
  });
});
