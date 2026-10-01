import { recipesApi } from "@/api/recipes/api";
import Hint from "@/components/ui/Hint";
import Ingredient from "@/components/ui/Ingredient";
import { useIngredientsStore } from "@/store/ingredients";
import cn from "@/utils/classname-func";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Camera, Upload, ChefHatIcon, CircleX, Loader2 } from "lucide-react";
import { useRef } from "react";
import { Route as recipesListRoute } from "@/routes/recipes/index";
import { Link } from "@tanstack/react-router";

export function ScanPage() {
  const navigate = useNavigate();
  const setCurrentIngredients = useIngredientsStore(
    (state) => state.setCurrentIngredients,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastIngredients = useIngredientsStore(
    (state) => state.currentIngredients,
  );

  const recognizeMutation = useMutation({
    mutationFn: recipesApi.recognize,
    onSuccess: (data) => {
      setCurrentIngredients(data.recognizedIngredients);

      navigate({ to: recipesListRoute.to });
    },
    onError: (error) => {
      console.error("Ошибка загрузки:", error);
    },
  });

  const lastIngredientsNotFound = lastIngredients.length == 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    recognizeMutation.mutate(file);

    e.target.value = "";
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-10 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-semibold">
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
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-8 items-start">
          <div className="flex flex-col gap-4">
            <button className="w-full rounded-2xl h-[300px] border-primary border-[2px] border-dashed bg-card flex flex-col items-center justify-center gap-5 transition-all hover:opacity-90 active:scale-[0.99]">
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

            {/* <button className="bg-secondary text-foreground w-full py-4 rounded-xl flex items-center justify-center gap-2.5 transition-all hover:opacity-90 active:scale-[0.99]">
              <Upload size={18} />
              <span>Загрузите изображение</span>
            </button> */}
            <button
              type="button"
              disabled={recognizeMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "bg-secondary text-foreground w-full py-4 rounded-xl flex items-center justify-center gap-2.5 transition-all",
                recognizeMutation.isPending
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:opacity-90 active:scale-[0.99]",
              )}
            >
              {recognizeMutation.isPending ? (
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
              {lastIngredients.map((ing) => (
                <Ingredient title={ing} key={ing} />
              ))}
              {lastIngredients.length == 0 && (
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
                "text-primary-foreground w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5",
                lastIngredientsNotFound
                  ? "bg-[rgba(61,107,79,0.5)]"
                  : "bg-primary transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer",
              )}
              disabled={lastIngredientsNotFound}
            >
              <ChefHatIcon size={18} />
              Найти рецепты с этими ингредиентами
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
