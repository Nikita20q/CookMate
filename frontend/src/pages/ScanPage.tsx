import { recipesApi } from "@/api/recipes/api";
import { setApiFormErrors } from "@/lib/form-errors";
import Hint from "@/components/ui/Hint";
import Ingredient from "@/components/ui/Ingredient";
import { useIngredientsStore } from "@/store/ingredients";
import cn from "@/utils/classname-func";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Camera, Upload, ChefHatIcon, CircleX, Loader2 } from "lucide-react";
import { useRef } from "react";
import { useController, useForm } from "react-hook-form";
import FormError from "@/components/ui/FormError";
import { Route as recipesListRoute } from "@/routes/recipes/index";
import { Link } from "@tanstack/react-router";

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

export function ScanPage() {
  const navigate = useNavigate();
  const setRecognitionResult = useIngredientsStore(
    (state) => state.setRecognitionResult,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { control, handleSubmit, setError, clearErrors, formState: { errors, isSubmitting } } = useForm<{ file: File | null }>({
    defaultValues: { file: null },
  });
  const { field: fileField } = useController({
    control,
    name: "file",
    rules: {
      required: "Выберите изображение",
      validate: (file) => !file || file.size <= MAX_PHOTO_SIZE ||
        "Размер изображения не должен превышать 10 МБ. Выберите файл меньшего размера.",
    },
  });
  const lastIngredients = useIngredientsStore(
    (state) => state.currentIngredients,
  );
  const historyError = useIngredientsStore((state) => state.historyError);
  const isInitializing = useIngredientsStore((state) => state.isInitializing);
  const initIngredients = useIngredientsStore((state) => state.initIngredients);

  const recognizeMutation = useMutation({
    mutationFn: recipesApi.recognize,
    onSuccess: (data) => {
      setRecognitionResult(data);

      navigate({ to: recipesListRoute.to });
    },
  });

  const handleRecognize = async ({ file }: { file: File | null }) => {
    if (!file) return;
    try {
      await recognizeMutation.mutateAsync(file);
    } catch (error) {
      setApiFormErrors(error, setError, ["file"], "Не удалось распознать продукты. Попробуйте загрузить фото ещё раз.");
    }
  };

  const lastIngredientsNotFound = lastIngredients.length == 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (isSubmitting) return;

    recognizeMutation.reset();
    clearErrors();
    fileField.onChange(file);
    void handleSubmit(handleRecognize)();
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 md:px-10 md:py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Что у вас сегодня{" "}
            <span className="text-primary">в холодильнике?</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-[520px]">
            Сфотографируйте или загрузите фотографию ваших ингредиентов. Мы
            подберем вам лучшие рецепты, которые вы можете приготовить прямо
            сейчас
          </p>
        </div>

        <input
          type="file"
          name={fileField.name}
          ref={(element) => { fileField.ref(element); fileInputRef.current = element; }}
          onBlur={fileField.onBlur}
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col gap-4">
            <button type="button" className="w-full rounded-2xl h-[300px] border-primary border-[2px] border-dashed bg-card flex flex-col items-center justify-center gap-5 transition-all hover:opacity-90 active:scale-[0.99]">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-secondary">
                <Camera size={34} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-semibold">Сделайте фото</p>
                <Hint
                  text="Наведите камеру на холодильник или стол с продуктами"
                  className="text-sm! mt-2"
                />
              </div>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted-foreground text-sm">или</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "bg-secondary text-foreground w-full py-4 rounded-xl flex items-center justify-center gap-2.5 transition-all",
                isSubmitting
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:opacity-90 active:scale-[0.99]",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Загрузка...</span>
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>Загрузите изображение</span>
                </>
              )}
            </button>

            <Hint text="Максимальный размер изображения — 10 МБ" className="text-center" />

            <FormError message={errors.file?.message} />
            <FormError message={errors.root?.server?.message} />

            <Hint
              text="Расположите продукты на столе для лучшей работы программы"
              className="text-center"
            />
          </div>

          <div
            className="rounded-2xl p-7 bg-card"
            style={{
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-2 mb-5">
              <span className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">
                Последнее сканирование
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {historyError && (
                <div className="w-full space-y-2">
                  <FormError message={historyError} />
                  <button type="button" disabled={isInitializing} className="text-sm text-primary" onClick={() => void initIngredients()}>
                    Повторить загрузку истории
                  </button>
                </div>
              )}
              {lastIngredients.map((ing) => (
                <Ingredient title={ing} key={ing} />
              ))}
              {lastIngredients.length == 0 && !historyError && (
                <div className="flex justify-center items-center flex-col gap-4">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center bg-secondary">
                    <CircleX size={34} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-foreground font-semibold">
                      Ингредиенты не найдены
                    </p>
                    <Hint
                      text="Мы не смогли распознать продукты на фото. Попробуйте сделать снимок при лучшем освещении."
                      className="text-sm! mt-2"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl p-4 mb-5 bg-secondary">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {lastIngredients.length} ингредиентов найдено
                  </p>
                  <Hint text="Готовы для поиска рецептов" />
                </div>
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    lastIngredientsNotFound
                      ? "bg-[rgba(61,107,79,0.5)]"
                      : "bg-primary",
                  )}
                >
                  <span className="text-white font-bold text-sm">
                    {lastIngredients.length}
                  </span>
                </div>
              </div>
            </div>

            <Link
              to={lastIngredients.length > 0 ? recipesListRoute.to : "."}
              className={cn(
                "text-primary-foreground w-full px-5 py-3.5 rounded-xl flex items-center justify-center gap-2.5 text-center",
                lastIngredientsNotFound
                  ? "bg-[rgba(61,107,79,0.5)]"
                  : "bg-primary transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer",
              )}
              disabled={lastIngredientsNotFound}
            >
              <ChefHatIcon size={18} />
              Найти подходящие рецепты
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
