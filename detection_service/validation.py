"""Shared upload policy: only validated pixels may reach inference."""
from dataclasses import dataclass
from io import BytesIO
import warnings

import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError

MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_REQUEST_BYTES = MAX_FILE_BYTES + 64 * 1024  # multipart headers/boundaries
MAX_IMAGE_PIXELS = 16_000_000
MAX_IMAGE_SIDE = 8192
ALLOWED_FORMATS = ("JPEG", "PNG")


class ValidationError(ValueError):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class ValidatedImage:
    pixels: np.ndarray
    format: str


def validate_image(raw: bytes) -> ValidatedImage:
    if not isinstance(raw, bytes) or not raw:
        raise ValidationError("Файл изображения пуст или имеет неверный тип")
    if len(raw) > MAX_FILE_BYTES:
        raise ValidationError("Превышен допустимый размер файла", 413)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw)) as image:
                image_format = image.format
                if image_format not in ALLOWED_FORMATS:
                    raise ValidationError("Разрешены только JPEG и PNG", 415)
                width, height = image.size
                if (width > MAX_IMAGE_SIDE or height > MAX_IMAGE_SIDE
                        or width * height > MAX_IMAGE_PIXELS):
                    raise ValidationError("Превышены допустимые размеры изображения", 413)
                image.verify()
            # verify() alone does not decode JPEG pixel data.
            with Image.open(BytesIO(raw)) as image:
                image.load()
        pixels = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
        if pixels is None:
            raise ValidationError("Не удалось прочитать изображение")
    except (Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ValidationError("Превышены допустимые размеры изображения", 413) from None
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, cv2.error) as exc:
        if isinstance(exc, ValidationError):
            raise
        raise ValidationError("Не удалось прочитать изображение") from None
    return ValidatedImage(pixels=pixels, format=image_format)
