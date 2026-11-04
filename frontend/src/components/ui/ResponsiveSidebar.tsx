import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import cn from "@/utils/classname-func";

interface Props {
  id: string;
  title: string;
  breakpoint: "md" | "lg";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children: ReactNode;
  contentClassName?: string;
}

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

export default function ResponsiveSidebar({
  id, title, breakpoint, open, onOpenChange, collapsed = false,
  onCollapsedChange, children, contentClassName,
}: Props) {
  const docked = useMediaQuery(breakpoint === "md" ? "(min-width: 48rem)" : "(min-width: 64rem)");
  const modal = !docked && open;
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!modal) return;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>(focusableSelector)?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
      if (event.key === "Tab") {
        const elements = [...(panel.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])];
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const keepFocusInside = (event: FocusEvent) => {
      if (!panel.current?.contains(event.target as Node)) {
        panel.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("focusin", keepFocusInside);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("focusin", keepFocusInside);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [modal, onOpenChange]);

  const compact = docked && collapsed;
  return (
    <>
      <div
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
        className={cn(
          "fixed inset-0 z-50 bg-black/45 transition-opacity duration-300 motion-reduce:transition-none",
          modal ? "opacity-100" : "pointer-events-none opacity-0",
          breakpoint === "md" ? "md:hidden" : "lg:hidden",
        )}
      />
      <aside
        ref={panel}
        id={id}
        role={modal ? "dialog" : undefined}
        aria-modal={modal || undefined}
        aria-label={title}
        aria-hidden={!docked && !open}
        inert={!docked && !open}
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest("a[href]")) onOpenChange(false);
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex h-dvh max-w-[calc(100vw-3rem)] shrink-0 flex-col border-r bg-card shadow-xl transition-[transform,width,visibility] duration-300 motion-reduce:transition-none",
          !docked && !open ? "invisible -translate-x-full" : "visible translate-x-0",
          breakpoint === "md"
            ? "md:fixed md:z-40 md:w-[240px] md:max-w-none md:shadow-none"
            : "lg:sticky lg:top-0 lg:z-20 lg:max-w-none lg:self-start lg:shadow-none",
          docked && breakpoint === "lg" ? (compact ? "w-14" : "w-[280px]") : "w-80",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-3">
          {!compact && <h2 className="px-2 text-sm font-bold">{title}</h2>}
          {docked ? onCollapsedChange && (
            <button
              type="button"
              aria-label={collapsed ? "Развернуть ингредиенты" : "Свернуть ингредиенты"}
              aria-expanded={!collapsed}
              aria-controls={`${id}-content`}
              onClick={() => onCollapsedChange(!collapsed)}
              className="rounded-lg p-2 text-primary hover:bg-secondary focus-visible:outline-2"
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          ) : (
            <button
              type="button"
              aria-label={`Закрыть: ${title}`}
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-2 hover:bg-secondary focus-visible:outline-2"
            >
              <X size={22} />
            </button>
          )}
        </div>
        <div
          id={`${id}-content`}
          hidden={compact}
          className={cn("min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain", compact ? "hidden" : "flex", contentClassName)}
        >
          {children}
        </div>
      </aside>
    </>
  );
}
