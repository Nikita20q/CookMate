import { Download, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import ActionButton from "@/components/ui/ActionButton";
import FormError from "@/components/ui/FormError";
import cn from "@/utils/classname-func";

interface PhotoEditorProps {
  contextLabel: string;
  downloadName: string;
  imageUrl: string;
  imageFile: File | null;
  editing: boolean;
  onChange: (file: File | null) => void;
  className?: string;
}

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

export default function PhotoEditor({
  contextLabel, downloadName, imageUrl, imageFile, editing, onChange, className,
}: PhotoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [error, setError] = useState<string>();
  const helpId = useId();
  const errorId = useId();
  const hasPhoto = !!imageUrl || !!imageFile;

  useEffect(() => {
    if (!imageFile) return;
    const previewUrl = URL.createObjectURL(imageFile);
    if (imageRef.current) imageRef.current.src = previewUrl;
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const downloadPhoto = () => {
    const href = imageRef.current?.src;
    if (!href) return;
    const link = document.createElement("a");
    link.href = href;
    link.download = imageFile?.name ?? downloadName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  };

  if (!editing && !hasPhoto) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {editing && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          aria-label={`Фотография ${contextLabel}`}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (!file.type.startsWith("image/")) {
              setError("Выберите изображение.");
              return;
            }
            if (file.size > MAX_PHOTO_SIZE) {
              setError("Размер изображения не должен превышать 10 МБ.");
              return;
            }
            setError(undefined);
            onChange(file);
          }}
        />
      )}

      {hasPhoto ? (
        <div className="relative overflow-hidden rounded-xl border bg-secondary">
          <img
            ref={imageRef}
            src={imageFile ? undefined : imageUrl}
            alt={`Фотография ${contextLabel}`}
            className="max-h-80 w-full object-contain"
          />
          {editing && (
            <div className="absolute right-2 top-2 flex gap-0.5 rounded-lg bg-card/95 p-0.5 shadow-sm">
              <ActionButton
                variant="neutral"
                aria-label={`Скачать фотографию ${contextLabel}`}
                onClick={downloadPhoto}
              >
                <Download size={17} />
              </ActionButton>
              <ActionButton
                aria-label={`Заменить фотографию ${contextLabel}`}
                onClick={() => inputRef.current?.click()}
              >
                <RefreshCw size={17} />
              </ActionButton>
              <ActionButton
                variant="destructive"
                aria-label={`Удалить фотографию ${contextLabel}`}
                onClick={() => {
                  setError(undefined);
                  onChange(null);
                }}
              >
                <Trash2 size={17} />
              </ActionButton>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          aria-label={`Добавить фотографию ${contextLabel}`}
          aria-describedby={error ? errorId : helpId}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-muted-foreground/30 bg-secondary/40 p-5 text-muted-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ImagePlus size={28} strokeWidth={1.5} />
          <span className="text-sm font-medium">Добавить фотографию</span>
          <span id={helpId} className="text-xs">Необязательно · одно изображение до 10 МБ</span>
        </button>
      )}
      {editing && <FormError id={errorId} message={error} />}
    </div>
  );
}
