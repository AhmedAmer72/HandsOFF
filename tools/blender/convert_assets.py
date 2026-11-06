"""Convert one source model to a runtime GLB copy. The source file is only read."""

import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
runpy.run_path(str(Path(__file__).with_name("export_glb.py")), run_name="__main__")
