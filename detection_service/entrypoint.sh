#!/bin/sh
set -eu
sh /app/run_tests.sh
echo 'Tests passed. Starting CookMate detection_service...'
exec "$@"
