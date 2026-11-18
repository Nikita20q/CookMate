import Button from "@/components/ui/Button";
import { Save, X } from "lucide-react";
import FormError from "@/components/ui/FormError";

interface RecipeEditActionsProps {
  onCancel: () => void;
  onSave: () => void;
  isSaving?: boolean;
  error?: string;
}

export default function RecipeEditActions({
  onCancel,
  onSave,
  isSaving = false,
  error,
}: RecipeEditActionsProps) {
  return (
    <section
      aria-label="Действия редактирования рецепта"
      className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 md:left-[calc(240px+1rem)]"
    >
      <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-primary/20 bg-card p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Редактирование рецепта</p>
          <FormError message={error} />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1"
          >
            <X size={16} />
            Отменить
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={isSaving}
            className="flex-1"
          >
            <Save size={16} />
            {isSaving ? "Сохраняем…" : "Сохранить"}
          </Button>
        </div>
      </div>
    </section>
  );
}
