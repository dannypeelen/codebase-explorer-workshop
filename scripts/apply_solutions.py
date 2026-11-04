#!/usr/bin/env python3
"""Copy the reference solution(s) over the matching backend/exercises/*.py
file(s). For a stuck student who wants to see a working version and move
on, or a facilitator who wants to demo with everything finished.

    python -m scripts.apply_solutions            # all four
    python -m scripts.apply_solutions 1 3         # just Exercises 1 and 3

Overwrites the target file — commit or copy your in-progress attempt
first if you want to keep it.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

EXERCISE_FILES = {
    1: "semantic_search.py",
    2: "graph_traversal.py",
    3: "hybrid_retrieval.py",
    4: "qa.py",
}


def main() -> int:
    requested = [int(a) for a in sys.argv[1:]] or list(EXERCISE_FILES)
    for n in requested:
        filename = EXERCISE_FILES[n]
        src = ROOT / "solutions" / filename
        dst = ROOT / "backend" / "exercises" / filename
        shutil.copy(src, dst)
        print(f"Exercise {n}: copied solutions/{filename} -> backend/exercises/{filename}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
