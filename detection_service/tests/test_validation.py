import unittest
from unittest.mock import patch
import numpy as np
from PIL import Image

import validation as v
from helpers import image_bytes


class ImageValidationTests(unittest.TestCase):
    def reject(self, raw, status=400):
        with self.assertRaises(v.ValidationError) as caught:
            v.validate_image(raw)
        self.assertEqual(caught.exception.status_code, status)
        return str(caught.exception)

    def test_valid_png(self):
        result = v.validate_image(image_bytes())
        self.assertEqual(result.format, "PNG")
        self.assertEqual(result.pixels.shape, (12, 16, 3))
        self.assertEqual(result.pixels.dtype, np.uint8)

    def test_valid_jpeg(self):
        self.assertEqual(v.validate_image(image_bytes("JPEG")).format, "JPEG")

    def test_grayscale_and_alpha_normalized_to_three_channels(self):
        for mode in ("L", "RGBA"):
            with self.subTest(mode=mode):
                self.assertEqual(v.validate_image(image_bytes(mode=mode)).pixels.shape, (12, 16, 3))

    def test_empty_file_rejected(self):
        self.reject(b"")

    def test_non_bytes_rejected(self):
        for raw in (None, True, 123, "image", [], {}):
            with self.subTest(type=type(raw).__name__):
                self.reject(raw)

    def test_text_and_script_rejected_without_echo(self):
        raw = b'<script>secret-token</script>'
        self.assertNotIn("secret-token", self.reject(raw))

    def test_png_signature_without_pixels_rejected(self):
        self.reject(b'\x89PNG\r\n\x1a\n')

    def test_truncated_png_rejected(self):
        self.reject(image_bytes()[:40])

    def test_truncated_jpeg_rejected(self):
        self.reject(image_bytes("JPEG")[:-20])

    def test_disallowed_formats(self):
        for fmt in ("GIF", "BMP", "TIFF"):
            with self.subTest(format=fmt):
                self.reject(image_bytes(fmt), 415)

    def test_file_size_at_limit_accepted(self):
        raw = image_bytes()
        with patch.object(v, "MAX_FILE_BYTES", len(raw)):
            self.assertEqual(v.validate_image(raw).format, "PNG")

    def test_file_size_over_limit_rejected_before_decode(self):
        raw = image_bytes()
        with patch.object(v, "MAX_FILE_BYTES", len(raw) - 1), patch.object(v.Image, "open") as decoder:
            self.reject(raw, 413)
            decoder.assert_not_called()

    def test_pixel_count_at_limit_accepted(self):
        with patch.object(v, "MAX_IMAGE_PIXELS", 192):
            v.validate_image(image_bytes())

    def test_pixel_count_over_limit_rejected(self):
        with patch.object(v, "MAX_IMAGE_PIXELS", 191):
            self.reject(image_bytes(), 413)

    def test_side_at_limit_accepted(self):
        with patch.object(v, "MAX_IMAGE_SIDE", 16):
            v.validate_image(image_bytes())

    def test_width_and_height_over_limit_rejected(self):
        with patch.object(v, "MAX_IMAGE_SIDE", 16):
            for size in ((17, 1), (1, 17)):
                with self.subTest(size=size):
                    self.reject(image_bytes(size=size), 413)

    def test_decompression_bomb_warning_rejected(self):
        with patch.object(Image, "MAX_IMAGE_PIXELS", 100):
            self.reject(image_bytes(), 413)

    def test_decompression_bomb_error_rejected(self):
        with patch.object(Image, "MAX_IMAGE_PIXELS", 50):
            self.reject(image_bytes(), 413)

    def test_opencv_decode_failure_rejected(self):
        with patch.object(v.cv2, "imdecode", return_value=None):
            self.reject(image_bytes())
