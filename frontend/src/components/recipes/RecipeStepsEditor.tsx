import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Menu, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useController, useFieldArray, type UseFormReturn } from "react-hook-form";
import ActionButton from "@/components/ui/ActionButton";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Textarea from "@/components/ui/Textarea";
import type { RecipeEditorStep, RecipeEditorValues } from "@/types/recipe-editor";
import cn from "@/utils/classname-func";
import PhotoEditor from "@/components/ui/PhotoEditor";

interface EditorProps {
  form: UseFormReturn<RecipeEditorValues>;
}

interface StepRowProps extends EditorProps {
  id: string;
  index: number;
  count: number;
  onRemove: () => void;
}

function StepRow({ form, id, index, count, onRemove }: StepRowProps) {
  const name = `steps.${index}.stepInstruction` as const;
  const { field, fieldState } = useController({
    control: form.control,
    name,
  });
  const { field: imageUrl } = useController({ control: form.control, name: `steps.${index}.imageUrl` });
  const { field: imageFile } = useController({ control: form.control, name: `steps.${index}.imageFile` });
  const [original, setOriginal] = useState<RecipeEditorStep | null>(() =>
    field.value === "" ? { ...form.getValues(`steps.${index}`) } : null,
  );
  const editing = original !== null;
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging,
  } = useSortable({ id, disabled: editing || count < 2 });
  const number = index + 1;

  const finishEditing = async () => {
    if (!await form.trigger(name)) return;
    field.onChange(field.value.trim());
    setOriginal(null);
  };

  const cancelEditing = () => {
    if (!original) return;
    if (!original.stepInstruction && !original.imageUrl && !original.imageFile) {
      onRemove();
      return;
    }
    field.onChange(original.stepInstruction);
    imageUrl.onChange(original.imageUrl);
    imageFile.onChange(original.imageFile);
    form.clearErrors(name);
    setOriginal(null);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative min-w-0 rounded-xl border bg-card p-3 sm:p-4",
        { "z-10 shadow-lg ring-2 ring-primary/30": isDragging },
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Переместить шаг ${number}`}
          disabled={editing || count < 2}
          className="inline-flex size-9 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-muted-foreground/60 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40"
        >
          <Menu size={18} />
        </button>
        <h3 className="min-w-0 flex-1 text-sm font-semibold">Шаг {number}</h3>
        <div className="ml-auto flex shrink-0 gap-0.5">
          {editing ? (
            <>
              <ActionButton variant="success" aria-label={`Применить изменения шага ${number}`} onClick={() => void finishEditing()}>
                <Check size={17} />
              </ActionButton>
              <ActionButton variant="neutral" aria-label={`Отменить изменения шага ${number}`} onClick={cancelEditing}>
                <X size={17} />
              </ActionButton>
            </>
          ) : (
            <ActionButton
              aria-label={`Редактировать шаг ${number}`}
              disabled={isDragging}
              onClick={() => setOriginal({ ...form.getValues(`steps.${index}`) })}
            >
              <Pencil size={17} />
            </ActionButton>
          )}
          <ActionButton variant="destructive" aria-label={`Удалить шаг ${number}`} disabled={isDragging} onClick={onRemove}>
            <Trash2 size={17} />
          </ActionButton>
        </div>
      </div>

      {editing ? (
        <Textarea
          {...field}
          autoFocus
          rows={5}
          aria-label={`Текст шага ${number}`}
          error={fieldState.error?.message}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              cancelEditing();
            } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              void finishEditing();
            }
          }}
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">{field.value}</p>
      )}
      {!editing && <FormError message={fieldState.error?.message} />}
      <PhotoEditor
        key={editing ? "editing" : "preview"}
        contextLabel={`шага ${number}`}
        downloadName={`step-${number}`}
        className="mt-3"
        imageUrl={imageUrl.value}
        imageFile={imageFile.value}
        editing={editing}
        onChange={(file) => {
          imageFile.onChange(file);
          if (!file) imageUrl.onChange("");
        }}
      />
    </li>
  );
}

export default function RecipeStepsEditor({ form }: EditorProps) {
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "steps" });
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
          draggable: "Нажмите пробел, чтобы поднять шаг. Перемещайте его стрелками вверх и вниз. Нажмите пробел для завершения или Escape для отмены.",
        },
        announcements: {
          onDragStart: () => "Шаг поднят.",
          onDragOver: ({ over }) => over
            ? `Позиция ${fields.findIndex((field) => field.id === over.id) + 1} из ${fields.length}.`
            : "Шаг за пределами списка.",
          onDragEnd: () => "Перемещение шага завершено.",
          onDragCancel: () => "Перемещение шага отменено.",
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
        <ol aria-label="Шаги инструкции" className="flex min-w-0 flex-col gap-3">
          {fields.map((field, index) => (
            <StepRow key={field.id} id={field.id} index={index} count={fields.length} form={form} onRemove={() => remove(index)} />
          ))}
        </ol>
      </SortableContext>
      {fields.length === 0 && <p className="text-sm text-muted-foreground">В рецепте нет шагов инструкции.</p>}
      <FormError message={form.formState.errors.steps?.root?.message} />
      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={() => append({ stepTitle: "", stepInstruction: "", imageUrl: "", imageFile: null }, { shouldFocus: false })}
      >
        <Plus size={17} />
        Добавить шаг
      </Button>
    </DndContext>
  );
}
