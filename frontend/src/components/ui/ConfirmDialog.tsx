import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";

interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "destructive";
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmVariant = "primary",
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const overlay = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = [...document.body.children]
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && element !== overlay.current,
      )
      .map((element) => ({ element, inert: element.inert }));
    background.forEach(({ element }) => {
      element.inert = true;
    });
    document.body.style.overflow = "hidden";
    cancelButton.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
      if (event.key === "Tab") {
        const buttons = panel.current?.querySelectorAll<HTMLButtonElement>(
          "button:not([disabled])",
        );
        const first = buttons?.[0];
        const last = buttons?.[buttons.length - 1];
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
      if (!panel.current?.contains(event.target as Node))
        cancelButton.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", keepFocusInside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", keepFocusInside);
      document.body.style.overflow = previousOverflow;
      background.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, [onCancel]);

  return createPortal(
    <div
      ref={overlay}
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/45 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl"
      >
        <h2 id={titleId} className="font-serif text-xl font-semibold">
          {title}
        </h2>
        <p
          id={descriptionId}
          className="mt-3 text-sm leading-relaxed text-muted-foreground"
        >
          {description}
        </p>
        <div className="mt-6 flex flex-row justify-end gap-2">
          <Button
            className="flex-1"
            ref={cancelButton}
            variant="secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button className="flex-1" variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
