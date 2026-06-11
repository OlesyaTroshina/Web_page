#!/usr/bin/env python3
"""Переименование foto robot и кириллических категорий в ASCII-пути."""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FOTO_CANDIDATES = (ROOT / "assets" / "foto", ROOT / "assets" / "foto robot")

CATEGORY_RENAMES = {
    "Торты": "cakes",
    "Зефирные композиции": "marshmallow",
    "Пасхальная выпечка": "easter-baking",
}

WEB_KINDS = ("thumb", "full")


def rename_if_exists(src: Path, dest: Path) -> None:
    if not src.exists():
        return
    if dest.exists():
        print(f"skip exists: {dest.relative_to(ROOT)}")
        return
    try:
        src.rename(dest)
    except OSError:
        shutil.copytree(src, dest)
        shutil.rmtree(src)
    print(f"renamed: {src.relative_to(ROOT)} -> {dest.relative_to(ROOT)}")


def pick_foto_root() -> Path | None:
    for candidate in FOTO_CANDIDATES:
        if candidate.is_dir():
            return candidate
    return None


def main() -> int:
    foto = pick_foto_root()
    if foto is None:
        print("missing foto root", flush=True)
        return 1

    for old_name, new_name in CATEGORY_RENAMES.items():
        rename_if_exists(foto / old_name, foto / new_name)
        for kind in WEB_KINDS:
            rename_if_exists(ROOT / "assets" / "web" / kind / old_name, ROOT / "assets" / "web" / kind / new_name)

    print(f"using foto root: {foto.relative_to(ROOT)}")
    print("done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
