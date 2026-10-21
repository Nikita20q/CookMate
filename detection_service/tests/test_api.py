"""Real FastAPI/multipart/image decoding; only YOLO is replaced by a test double."""
import importlib.util
import os
from pathlib import Path
import sys
import tempfile
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

import numpy as np
from fastapi.testclient import TestClient

from helpers import image_bytes
import validation


def load_test_app():
    ultralytics = ModuleType("ultralytics")
    ultralytics.YOLO = MagicMock(side_effect=lambda path: MagicMock())
    spec = importlib.util.spec_from_file_location("detector_under_test", Path(__file__).resolve().parents[1] / "main.py")
    module = importlib.util.module_from_spec(spec)
    with tempfile.TemporaryDirectory() as directory:
        for name in ("yolo11n_best.pt", "yolo11s_best.pt"):
            Path(directory, name).touch()
        with patch.dict(sys.modules, {"ultralytics": ultralytics}), patch.dict(os.environ, {
            "MODEL_DIR": directory, "CONF_NANO": "0.30", "CONF_SMALL": "0.75", "IOU_NMS": "0.45"
        }):
            spec.loader.exec_module(module)
    return module


main = load_test_app()
ENDPOINTS = ("/predict", "/predict/small_only", "/predict/nano_only")


def box(cls=0, confidence=.9, coords=(0, 0, 10, 10)):
    return SimpleNamespace(cls=[cls], conf=[confidence], xyxy=np.array([coords]))


class DetectorApiTests(unittest.TestCase):
    def setUp(self):
        for model in (main.model_small, main.model_nano):
            model.reset_mock(side_effect=True, return_value=True)
            model.names = {0: "milk", 1: "apple"}
            model.predict.return_value = [SimpleNamespace(boxes=[])]
        self.client = TestClient(main.app, raise_server_exceptions=False)
        self.addCleanup(self.client.close)

    def upload(self, endpoint="/predict", raw=None, filename="fridge.png", mime="image/png"):
        return self.client.post(endpoint, files={"file": (filename, image_bytes() if raw is None else raw, mime)})

    def assert_no_inference(self):
        main.model_small.predict.assert_not_called()
        main.model_nano.predict.assert_not_called()

    def test_health(self):
        self.assertEqual(self.client.get("/health").json(), {"status": "ok", "models_loaded": True})

    def test_valid_jpeg_and_png_all_endpoints(self):
        for endpoint in ENDPOINTS:
            for fmt in ("JPEG", "PNG"):
                with self.subTest(endpoint=endpoint, format=fmt):
                    response = self.upload(endpoint, image_bytes(fmt))
                    self.assertEqual(response.status_code, 200, response.text)
                    self.assertEqual(response.json()["count"], 0)

    def test_ensemble_contract_sorting_deduplication_and_stats(self):
        main.model_small.predict.return_value = [SimpleNamespace(boxes=[box(confidence=.8)])]
        main.model_nano.predict.return_value = [SimpleNamespace(boxes=[box(confidence=.6), box(cls=1, confidence=.95)])]
        response = self.upload()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {
            "detections": [
                {"class": "apple", "confidence": .95, "bbox": [0., 0., 10., 10.], "source": "nano"},
                {"class": "milk", "confidence": .8, "bbox": [0., 0., 10., 10.], "source": "small"}],
            "count": 2, "stats": {"from_small": 1, "from_nano_added": 1, "total_nano": 2}})
        for model, confidence in ((main.model_small, .75), (main.model_nano, .30)):
            model.predict.assert_called_once()
            self.assertEqual(model.predict.call_args.args[0].shape, (12, 16, 3))
            self.assertEqual(model.predict.call_args.kwargs, {"conf": confidence, "iou": .45, "verbose": False, "device": "cpu"})

    def test_single_model_endpoints_only_call_selected_model(self):
        for endpoint, selected, other in ((ENDPOINTS[1], main.model_small, main.model_nano), (ENDPOINTS[2], main.model_nano, main.model_small)):
            with self.subTest(endpoint=endpoint):
                selected.predict.reset_mock()
                other.predict.reset_mock()
                selected.predict.return_value = [SimpleNamespace(boxes=[box()])]
                response = self.upload(endpoint)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["count"], 1)
                selected.predict.assert_called_once()
                other.predict.assert_not_called()

    def test_invalid_images_never_reach_models(self):
        for endpoint in ENDPOINTS:
            for raw in (b"", b"not an image", image_bytes()[:40]):
                with self.subTest(endpoint=endpoint, length=len(raw)):
                    self.assertEqual(self.upload(endpoint, raw).status_code, 400)
        self.assert_no_inference()

    def test_missing_file_rejected(self):
        for endpoint in ENDPOINTS:
            self.assertEqual(self.client.post(endpoint).status_code, 422)
        self.assert_no_inference()

    def test_text_instead_of_file_rejected_without_echo(self):
        for endpoint in ENDPOINTS:
            response = self.client.post(endpoint, data={"file": "secret-input"})
            self.assertEqual(response.status_code, 422)
            self.assertNotIn("secret-input", response.text)
        self.assert_no_inference()

    def test_json_instead_of_multipart_rejected(self):
        response = self.client.post("/predict", json={"file": "../../secret"})
        self.assertEqual(response.status_code, 422)
        self.assertNotIn("secret", response.text)
        self.assert_no_inference()

    def test_unknown_fields_rejected(self):
        for endpoint in ENDPOINTS:
            response = self.client.post(endpoint, files={"file": ("x.png", image_bytes())}, data={"model_path": "/secret"})
            self.assertEqual(response.status_code, 400)
            self.assertNotIn("/secret", response.text)
        self.assert_no_inference()

    def test_duplicate_file_fields_rejected(self):
        for endpoint in ENDPOINTS:
            response = self.client.post(endpoint, files=[("file", ("a.png", image_bytes())), ("file", ("b.png", image_bytes()))])
            self.assertEqual(response.status_code, 400)
        self.assert_no_inference()

    def test_format_allowlist_uses_content_not_mime_or_extension(self):
        for endpoint in ENDPOINTS:
            self.assertEqual(self.upload(endpoint, image_bytes("GIF"), "photo.png", "image/png").status_code, 415)
        self.assert_no_inference()
        self.assertEqual(self.upload(mime="application/octet-stream").status_code, 200)

    def test_filename_is_metadata_not_file_path_or_command(self):
        for name in ("../../secret.png", "/tmp/secret.png", "$(touch hacked).png", "фото холодильника.png"):
            with self.subTest(filename=name), patch("builtins.open") as opened, patch("os.system") as system:
                self.assertEqual(self.upload(filename=name).status_code, 200)
                opened.assert_not_called()
                system.assert_not_called()

    def test_file_over_limit_rejected(self):
        with patch.object(validation, "MAX_FILE_BYTES", 8):
            for endpoint in ENDPOINTS:
                self.assertEqual(self.upload(endpoint).status_code, 413)
        self.assert_no_inference()

    def test_image_dimensions_over_limit_rejected(self):
        with patch.object(validation, "MAX_IMAGE_PIXELS", 100):
            for endpoint in ENDPOINTS:
                self.assertEqual(self.upload(endpoint).status_code, 413)
        self.assert_no_inference()

    def test_request_over_limit_rejected(self):
        from request_limits import MAX_REQUEST_BYTES
        response = self.client.post("/predict", content=b"x" * (MAX_REQUEST_BYTES + 1))
        self.assertEqual(response.status_code, 413)
        self.assert_no_inference()

    def test_internal_errors_do_not_leak_details(self):
        for model in (main.model_small, main.model_nano):
            model.predict.side_effect = RuntimeError("secret-token /app/models/private.pt")
        for endpoint in ENDPOINTS:
            response = self.upload(endpoint)
            self.assertEqual(response.status_code, 500)
            self.assertEqual(response.json(), {"detail": "Ошибка распознавания изображения"})


class DetectionLogicTests(unittest.TestCase):
    def test_iou_geometry(self):
        for first, second, expected in (
            ([0, 0, 10, 10], [0, 0, 10, 10], 1),
            ([0, 0, 10, 10], [10, 0, 20, 10], 0),
            ([0, 0, 0, 0], [0, 0, 0, 0], 0),
            ([0, 0, 10, 10], [5, 0, 15, 10], 1 / 3),
        ):
            with self.subTest(first=first, second=second):
                self.assertAlmostEqual(main.compute_iou(first, second), expected)

    def test_iou_threshold_boundary(self):
        small = {"class": "milk", "bbox": [0, 0, 10, 10]}
        nano = {"class": "milk", "bbox": [0, 0, 10, 10]}
        with patch.object(main, "IOU_NMS", 1):
            self.assertEqual(len(main.merge_detections([small], [nano])), 2)
        with patch.object(main, "IOU_NMS", .99):
            self.assertEqual(main.merge_detections([small], [nano]), [small])

    def test_separate_objects_retained_and_nano_duplicates_removed(self):
        small = {"class": "milk", "bbox": [0, 0, 10, 10]}
        nano = {"class": "milk", "bbox": [20, 0, 30, 10]}
        original = [small]
        self.assertEqual(main.merge_detections(original, [nano, dict(nano)]), [small, nano])
        self.assertEqual(original, [small])

    def test_prediction_rounding_and_source(self):
        model = MagicMock(names={0: "milk"})
        model.predict.return_value = [SimpleNamespace(boxes=[box(confidence=.98765, coords=(.123, .267, 10.124, 10.267))])]
        self.assertEqual(main.run_prediction(model, np.zeros((2, 2, 3)), .3), [
            {"class": "milk", "confidence": .988, "bbox": [.1, .3, 10.1, 10.3], "source": "nano"}])
