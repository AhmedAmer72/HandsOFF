#!/usr/bin/env bash
set -euo pipefail
if ! command -v blender >/dev/null 2>&1; then
  echo "Blender is not on PATH. Install blender before running the pipeline." >&2
  exit 1
fi
blender --version
echo "Blender background mode is available."
