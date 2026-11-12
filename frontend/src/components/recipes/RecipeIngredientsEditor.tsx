import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Menu, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useController, useFieldArray, type UseFormReturn } from "react-hook-form";
import ActionButton from "@/components/ui/ActionButton";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import type { RecipeEditorValues } from "@/types/recipe-editor";
import cn from "@/utils/classname-func";

interface EditorProps {
  form: UseFormReturn<RecipeEditorValues>;
}

interface IngredientRowProps extends EditorProps {
  id: string;
  index: number;
  count: number;
  onRemove: () => void;
}

function IngredientRow({ form, id, index, count, onRemove }: IngredientRowProps) {
  const name = `components.${index}.title` as const;
  const { field, fieldState } = useController({
    control: form.control,
    name,
  });
  const [originalTitle, setOriginalTitle] = useState<string | null>(
    () => field.value === "" ? "" : null,
  );
  const editing = originalTitle !== null;
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging,
  } = useSortable({ id, disabled: editing || count < 2 });
  const title = field.value || `Ингредиент ${index + 1}`;

  const finishEditing = async () => {
    if (!await form.trigger(name)) return;
    field.onChange(field.value.trim().replace(/\s+/g, " "));
    setOriginalTitle(null);
  };

  const cancelEditing = () => {
    if (originalTitle === "") {
      onRemove();
      return;
    }
    field.onChange(originalTitle);
    form.clearErrors(name);
    setOriginalTitle(null);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative min-w-0 rounded-xl border bg-card px-2 py-2.5",
        { "z-10 shadow-lg ring-2 ring-primary/30": isDragging },
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Переместить ингредиент ${title}`}
          disabled={editing || count < 2}
          className="inline-flex size-9 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-muted-foreground/60 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40"
        >
          <Menu size={18} />
        </button>

        {editing ? (
          <Input
            {...field}
            autoFocus
            variant="compact"
            aria-label="Название ингредиента"
            error={fieldState.error?.message}
            containerClassName="flex-1"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void finishEditing();
              } else if (event.key === "Escape") {
                event.preventDefault();
                cancelEditing();
              }
            }}
          />
        ) : (
          <span className="min-w-0 flex-1 text-sm [overflow-wrap:anywhere]">{field.value}</span>
        )}

        <div className="ml-auto flex shrink-0 gap-0.5">
          {editing ? (
            <>
              <ActionButton variant="success" aria-label="Применить название ингредиента" onClick={() => void finishEditing()}>
                <Check size={17} />
              </ActionButton>
              <ActionButton variant="neutral" aria-label="Отменить изменение ингредиента" onClick={cancelEditing}>
                <X size={17} />
              </ActionButton>
            </>
          ) : (
            <ActionButton
              aria-label={`Редактировать ингредиент ${title}`}
              disabled={isDragging}
              onClick={() => setOriginalTitle(field.value)}
            >
              <Pencil size={17} />
            </ActionButton>
          )}
          <ActionButton
            variant="destructive"
            aria-label={`Удалить ингредиент ${title}`}
            disabled={isDragging}
            onClick={onRemove}
          >
            <Trash2 size={17} />
          </ActionButton>
        </div>
      </div>
      {!editing && <FormError message={fieldState.error?.message} />}
    </li>
  );
}

export default function RecipeIngredientsEditor({ form }: EditorProps) {
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "components" });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Нажмите пробел, чтобы поднять ингредиент. Перемещайте его стрелками вверх и вниз. Нажмите пробел для завершения или Escape для отмены.",
        },
        announcements: {
          onDragStart: () => "Ингредиент поднят.",
          onDragOver: ({ over }) => over
            ? `Позиция ${fields.findIndex((field) => field.id === over.id) + 1} из ${fields.length}.`
            : "Ингредиент за пределами списка.",
          onDragEnd: () => "Перемещение ингредиента завершено.",
          onDragCancel: () => "Перемещение ингредиента отменено.",
        },
      }}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        const from = fields.findIndex((field) => field.id === active.id);
        const to = fields.findIndex((field) => field.id === over.id);
        if (from !== -1 && to !== -1) move(from, to);
      }}
    >
      <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
        <ul aria-label="Ингредиенты рецепта" className="flex min-w-0 flex-col gap-2">
          {fields.map((field, index) => (
            <IngredientRow
              key={field.id}
              id={field.id}
              index={index}
              count={fields.length}
              form={form}
              onRemove={() => remove(index)}
            />
          ))}
        </ul>
      </SortableContext>
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">В рецепте нет ингредиентов.</p>
      )}
      <FormError message={form.formState.errors.components?.root?.message} />
      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={() => append({ title: "" }, { shouldFocus: false })}
      >
        <Plus size={17} />
        Добавить ингредиент
      </Button>
    </DndContext>
  );
}
