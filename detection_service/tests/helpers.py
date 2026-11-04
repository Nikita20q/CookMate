from io import BytesIO
from PIL import Image


def image_bytes(fmt="PNG", size=(16, 12), mode="RGB"):
    buffer = BytesIO()
    Image.new(mode, size).save(buffer, format=fmt)
    return buffer.getvalue()
