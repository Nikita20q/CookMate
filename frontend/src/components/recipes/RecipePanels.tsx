import { useSyncExternalStore, type ReactNode } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

// Keep this breakpoint in sync with the recipe page's xl height constraint.
const WIDE_LAYOUT_QUERY = "(min-width: 80rem)";

function subscribeToLayout(onChange: () => void) {
  const query = window.matchMedia(WIDE_LAYOUT_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getWideLayout() {
  return window.matchMedia(WIDE_LAYOUT_QUERY).matches;
}

interface RecipePanelsProps {
  overview: ReactNode;
  instructions: ReactNode;
}

export default function RecipePanels({
  overview,
  instructions,
}: RecipePanelsProps) {
  const isWideLayout = useSyncExternalStore(
    subscribeToLayout,
    getWideLayout,
    () => false,
  );

  if (!isWideLayout) {
    return (
      <div className="min-w-0">
        <section aria-label="Информация о рецепте" className="border-b">
          {overview}
        </section>
        <section aria-label="Инструкции приготовления">{instructions}</section>
      </div>
    );
  }

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
      <Group orientation="horizontal" className="h-full min-h-0 min-w-0">
        <Panel defaultSize={420} minSize={320} maxSize={600}>
          <section
            aria-label="Информация о рецепте"
            tabIndex={0}
            className="h-full overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2"
          >
            {overview}
          </section>
        </Panel>
        <Separator
          aria-label="Изменить ширину панелей рецепта"
          className="w-1 shrink-0 bg-border transition-colors hover:bg-primary/50 focus-visible:bg-primary/50"
        />
        <Panel minSize={320}>
          <section
            aria-label="Инструкции приготовления"
            tabIndex={0}
            className="h-full overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2"
          >
            {instructions}
          </section>
        </Panel>
      </Group>
    </div>
  );
}
