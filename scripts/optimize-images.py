#!/usr/bin/env python3
"""Сжатие медиа для сайта: thumb/full WebP + hero, фон, логотип, works-manifest."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = 200_000_000

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / "works-manifest.json"
WEB = ROOT / "assets" / "web"
FOTO = ROOT / "assets" / "foto robot"

THUMB_MAX = 560
FULL_MAX = 1800
HERO_MAX = 1400
ABOUT_MAX = 1200
BG_MAX = 1920
LOGO_MAX = 512

THUMB_QUALITY = 82
FULL_QUALITY = 85


def web_path(kind: str, source_rel: str) -> Path:
    """kind: thumb | full; source_rel like assets/foto robot/Cat/file.jpg"""
    rel = source_rel.replace("\\", "/")
    if rel.startswith("assets/foto robot/"):
        rel = rel[len("assets/foto robot/") :]
    stem = Path(rel).stem
    cat = str(Path(rel).parent).replace("\\", "/")
    if cat in (".", ""):
        out_dir = WEB / kind
    else:
        out_dir = WEB / kind / cat
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir / f"{stem}.webp"


def save_webp_rgba(src: Path, dest: Path, max_side: int, quality: int) -> bool:
    if not src.is_file():
        print(f"  skip (missing): {src}")
        return False
    if dest.is_file() and dest.stat().st_mtime >= src.stat().st_mtime:
        return True
    with Image.open(src) as im:
        im = im.convert("RGBA")
        w, h = im.size
        scale = min(1.0, max_side / max(w, h))
        if scale < 1.0:
            im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest, "WEBP", quality=quality, method=6)
    kb = dest.stat().st_size / 1024
    print(f"  ok {dest.relative_to(ROOT)} ({kb:.0f} KB, RGBA)")
    return True


def save_webp(src: Path, dest: Path, max_side: int, quality: int) -> bool:
    if not src.is_file():
        print(f"  skip (missing): {src}")
        return False
    if dest.is_file() and dest.stat().st_mtime >= src.stat().st_mtime:
        return True
    with Image.open(src) as im:
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            bg = Image.new("RGB", im.size, (255, 251, 252))
            bg.paste(im, mask=im.split()[3] if im.mode == "RGBA" else None)
            im = bg
        elif im.mode != "RGB":
            im = im.convert("RGB")
        w, h = im.size
        scale = min(1.0, max_side / max(w, h))
        if scale < 1.0:
            im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest, "WEBP", quality=quality, method=6)
    kb = dest.stat().st_size / 1024
    print(f"  ok {dest.relative_to(ROOT)} ({kb:.0f} KB)")
    return True


def rel_posix(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def process_manifest_image(source_rel: str) -> dict | None:
    src = ROOT / source_rel.replace("\\", "/")
    thumb = web_path("thumb", source_rel)
    full = web_path("full", source_rel)
    ok_t = save_webp(src, thumb, THUMB_MAX, THUMB_QUALITY)
    ok_f = save_webp(src, full, FULL_MAX, FULL_QUALITY)
    if not ok_t and not ok_f:
        return None
    return {"thumb": rel_posix(thumb), "full": rel_posix(full)}


def write_js_global(path: Path, var_name: str, data: object) -> None:
    text = f"window.{var_name} = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n"
    path.write_text(text, encoding="utf-8")
    kb = path.stat().st_size / 1024
    print(f"wrote {path.relative_to(ROOT)} ({kb:.1f} KB)")


def main() -> int:
    if not MANIFEST_PATH.is_file():
        print("works-manifest.json not found", file=sys.stderr)
        return 1

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8-sig"))
    new_manifest = {"categories": []}

    print("=== Portfolio thumb/full ===")
    for cat in manifest.get("categories", []):
        new_cat = {"title": cat.get("title"), "id": cat.get("id"), "images": []}
        for item in cat.get("images", []):
            src_rel = item if isinstance(item, str) else item.get("full") or item.get("thumb") or ""
            if not src_rel:
                continue
            entry = process_manifest_image(src_rel)
            if entry:
                new_cat["images"].append(entry)
        if new_cat["images"]:
            new_manifest["categories"].append(new_cat)

    MANIFEST_PATH.write_text(
        json.dumps(new_manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    write_js_global(ROOT / "works-manifest.js", "SLADOST_WORKS_MANIFEST", new_manifest)

    print("\n=== Hero ===")
    hero_src = ROOT / "assets" / "foto robot" / "Торты" / "20260113_205854.jpg"
    hero_dest = WEB / "hero.webp"
    save_webp(hero_src, hero_dest, HERO_MAX, FULL_QUALITY)

    print("\n=== About photo ===")
    about_src = ROOT / "assets" / "foto robot" / "Зефирные композиции" / "1.jpg"
    save_webp(about_src, WEB / "about-zefir.webp", ABOUT_MAX, FULL_QUALITY)

    print("\n=== Background ===")
    bg_src = ROOT / "assets" / "bg" / "rose-gold-texture.png"
    save_webp(bg_src, WEB / "rose-gold-texture.webp", BG_MAX, 80)

    print("\n=== Logo ===")
    logo_src = ROOT / "assets" / "logo-brand.png"
    save_webp_rgba(logo_src, WEB / "logo-brand.webp", LOGO_MAX, 90)

    reviews_path = ROOT / "reviews-tg.json"
    if reviews_path.is_file():
        reviews = json.loads(reviews_path.read_text(encoding="utf-8-sig"))
        write_js_global(ROOT / "reviews-tg.js", "SLADOST_REVIEWS", reviews)

    total_web = sum(f.stat().st_size for f in WEB.rglob("*") if f.is_file())
    print(f"\nDone. assets/web total: {total_web / 1024 / 1024:.2f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
