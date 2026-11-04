#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 1 ]]; then
  echo "usage: tools/blender/run_blender.sh script.py [args...]" >&2
  exit 1
fi
script=$1
shift
exec blender -b --python "$script" -- "$@"
