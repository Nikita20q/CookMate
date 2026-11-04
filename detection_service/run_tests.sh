#!/bin/sh
set -eu
cd "$(dirname "$0")"
echo 'CookMate detection_service: validation, HTTP API and ensemble tests (YOLO mocked)'
exec "${PYTHON:-python3}" -u -B -m unittest discover -s tests -p 'test_*.py' -v
