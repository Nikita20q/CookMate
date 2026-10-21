from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import os
from typing import List, Dict
from validation import MAX_FILE_BYTES, ValidationError, ValidatedImage, validate_image
from request_limits import RequestSizeLimit

app = FastAPI(title="CookMate Food Detector")
app.add_middleware(RequestSizeLimit)


@app.exception_handler(ValidationError)
async def validation_error_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})


@app.exception_handler(RequestValidationError)
async def request_error_handler(request, exc):
    # FastAPI's default response can echo untrusted input.
    return JSONResponse(status_code=422, content={"detail": "Ожидается один файл в поле file"})


async def validated_upload(request: Request, file: UploadFile = File(...)) -> ValidatedImage:
    form = await request.form()
    if len(form.multi_items()) != 1 or set(form) != {"file"}:
        raise ValidationError("Ожидается только одно поле file")
    # Filename and declared MIME type are untrusted metadata, never paths or commands.
    return validate_image(await file.read(MAX_FILE_BYTES + 1))


MODEL_DIR = os.getenv("MODEL_DIR", "./models")
MODEL_NANO_PATH = os.path.join(MODEL_DIR, "yolo11n_best.pt")
MODEL_SMALL_PATH = os.path.join(MODEL_DIR, "yolo11s_best.pt")

CONF_NANO = float(os.getenv("CONF_NANO", "0.30"))
CONF_SMALL = float(os.getenv("CONF_SMALL", "0.75"))
IOU_NMS = float(os.getenv("IOU_NMS", "0.45"))

if not os.path.exists(MODEL_NANO_PATH):
    raise RuntimeError(f"Модель nano не найдена: {MODEL_NANO_PATH}")
if not os.path.exists(MODEL_SMALL_PATH):
    raise RuntimeError(f"Модель small не найдена: {MODEL_SMALL_PATH}")

print(f"Загрузка моделей из {MODEL_DIR}...")
model_nano = YOLO(MODEL_NANO_PATH)
model_small = YOLO(MODEL_SMALL_PATH)
print(f"Модели загружены! | Nano conf={CONF_NANO}, Small conf={CONF_SMALL}")


def run_prediction(model, img, conf: float) -> List[Dict]:
    """Запускает предсказание одной моделью"""
    results = model.predict(img, conf=conf, iou=IOU_NMS, verbose=False, device='cpu')
    detections = []
    for box in results[0].boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        conf_val = float(box.conf[0])
        cls = int(box.cls[0])
        class_name = model.names[cls]
        detections.append({
            "class": class_name,
            "confidence": round(conf_val, 3),
            "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
            "source": "small" if model is model_small else "nano"
        })
    return detections


def compute_iou(box1: List[float], box2: List[float]) -> float:
    """Вычисляет IoU между двумя bounding box"""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter = max(0, x2 - x1) * max(0, y2 - y1)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = area1 + area2 - inter

    return inter / union if union > 0 else 0


def merge_detections(small_dets: List[Dict], nano_dets: List[Dict]) -> List[Dict]:
    """
    Объединяет детекции: small как основа + nano как дополнение.
    Удаляет дубликаты по IoU.
    """
    merged = list(small_dets)  # начинаем со всех детекций small

    for nano_det in nano_dets:
        is_duplicate = False
        for existing_det in merged:
            # если тот же класс & высокий IoU => дубликат
            if nano_det["class"] == existing_det["class"] and compute_iou(nano_det["bbox"], existing_det["bbox"]) > IOU_NMS:
                is_duplicate = True
                break

        if not is_duplicate:
            merged.append(nano_det)

    return merged


@app.post("/predict")
async def predict(image: ValidatedImage = Depends(validated_upload)):
    """Основной endpoint — ансамбль двух моделей"""
    try:
        img = image.pixels

        # Запускаем обе модели последовательно.
        small_dets = run_prediction(model_small, img, CONF_SMALL)
        nano_dets = run_prediction(model_nano, img, CONF_NANO)

        # объединяем результаты
        merged_dets = merge_detections(small_dets, nano_dets)

        # сортируем по уверенности (сначала самые уверенные)
        merged_dets.sort(key=lambda x: x["confidence"], reverse=True)

        return {
            "detections": merged_dets,
            "count": len(merged_dets),
            "stats": {
                "from_small": len(small_dets),
                "from_nano_added": len(merged_dets) - len(small_dets),
                "total_nano": len(nano_dets)
            }
        }

    except Exception:
        raise HTTPException(status_code=500, detail="Ошибка распознавания изображения") from None


def single_prediction(model, image, confidence):
    try:
        dets = run_prediction(model, image.pixels, confidence)
        return {"detections": dets, "count": len(dets)}
    except Exception:
        raise HTTPException(status_code=500, detail="Ошибка распознавания изображения") from None


@app.post("/predict/small_only")
async def predict_small(image: ValidatedImage = Depends(validated_upload)):
    """Только small модель (для сравнения)."""
    return single_prediction(model_small, image, CONF_SMALL)


@app.post("/predict/nano_only")
async def predict_nano(image: ValidatedImage = Depends(validated_upload)):
    """Только nano модель (для сравнения)."""
    return single_prediction(model_nano, image, CONF_NANO)


@app.get("/health")
async def health():
    return {"status": "ok", "models_loaded": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
