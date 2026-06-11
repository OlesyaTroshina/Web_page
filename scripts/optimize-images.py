#!/usr/bin/env python3
"""Сканирует assets/foto robot/, собирает works-manifest, WebP thumb/full, hero и прочие медиа."""

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

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
SKIP_DIR_NAMES = {".picasaoriginals", "__pycache__"}
HERO_CATEGORY = "Торты"
ABOUT_CATEGORY = "Зефирные композиции"
ABOUT_PREFERRED = "1.jpg"


def web_path(kind: str, source_rel: str) -> Path:
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


def category_id(title: str) -> str:
    slug = title.lower().strip()
    slug = re.sub(r"\s+", "-", slug)
    return slug


def image_sort_key(path: Path) -> tuple:
    stem = path.stem
    direct_date = re.match(r"^(\d{8})", stem)
    if direct_date:
        return (0, direct_date.group(1), stem)
    embedded_date = re.search(r"(\d{8})", stem)
    if embedded_date:
        return (0, embedded_date.group(1), stem)
    if stem.isdigit():
        return (1, stem.zfill(8), stem)
    return (2, f"{path.stat().st_mtime:.0f}", stem)


def list_category_images(cat_dir: Path) -> list[Path]:
    if not cat_dir.is_dir():
        return []
    files = [
        f
        for f in cat_dir.iterdir()
        if f.is_file() and f.suffix.lower() in IMAGE_EXT and not f.name.startswith(".")
    ]
    return sorted(files, key=image_sort_key)


def scan_foto_albums() -> list[tuple[str, list[Path]]]:
    if not FOTO.is_dir():
        print(f"foto album root missing: {FOTO}", file=sys.stderr)
        return []
    albums: list[tuple[str, list[Path]]] = []
    for cat_dir in sorted(FOTO.iterdir(), key=lambda p: p.name.casefold()):
        if not cat_dir.is_dir():
            continue
        if cat_dir.name.startswith(".") or cat_dir.name in SKIP_DIR_NAMES:
            continue
        images = list_category_images(cat_dir)
        if images:
            albums.append((cat_dir.name, images))
            print(f"  {cat_dir.name}: {len(images)} photo(s)")
    return albums


def process_source_image(src: Path) -> dict | None:
    source_rel = rel_posix(src)
    thumb = web_path("thumb", source_rel)
    full = web_path("full", source_rel)
    ok_t = save_webp(src, thumb, THUMB_MAX, THUMB_QUALITY)
    ok_f = save_webp(src, full, FULL_MAX, FULL_QUALITY)
    if not ok_t and not ok_f:
        return None
    return {"thumb": rel_posix(thumb), "full": rel_posix(full)}


def pick_newest(paths: list[Path]) -> Path | None:
    if not paths:
        return None
    return max(paths, key=image_sort_key)


def pick_about_source(albums: list[tuple[str, list[Path]]]) -> Path | None:
    for title, images in albums:
        if title != ABOUT_CATEGORY:
            continue
        preferred = next((p for p in images if p.name.lower() == ABOUT_PREFERRED.lower()), None)
        return preferred or images[0]
    return None


def write_js_global(path: Path, var_name: str, data: object) -> None:
    text = f"window.{var_name} = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n"
    path.write_text(text, encoding="utf-8")
    kb = path.stat().st_size / 1024
    print(f"wrote {path.relative_to(ROOT)} ({kb:.1f} KB)")


def main() -> int:
    print("=== Scan assets/foto robot ===")
    albums = scan_foto_albums()
    if not albums:
        print("No albums found", file=sys.stderr)
        return 1

    manifest: dict = {"categories": []}
    tort_images: list[Path] = []

    print("\n=== Portfolio thumb/full ===")
    for title, sources in albums:
        new_cat = {"title": title, "id": category_id(title), "images": []}
        for src in sources:
            entry = process_source_image(src)
            if entry:
                new_cat["images"].append(entry)
        if new_cat["images"]:
            manifest["categories"].append(new_cat)
        if title == HERO_CATEGORY:
            tort_images = sources

    hero_src = pick_newest(tort_images)
    if hero_src:
        hero_entry = process_source_image(hero_src)
        if hero_entry:
            manifest["hero"] = {
                "title": HERO_CATEGORY,
                "source": rel_posix(hero_src),
                "thumb": hero_entry["thumb"],
                "full": hero_entry["full"],
            }
            print(f"\n=== Hero (newest in «{HERO_CATEGORY}»: {hero_src.name}) ===")
            save_webp(hero_src, WEB / "hero.webp", HERO_MAX, FULL_QUALITY)
        else:
            print("\n=== Hero ===\n  skip: could not process newest tort photo")
    else:
        print(f"\n=== Hero ===\n  skip: no photos in «{HERO_CATEGORY}»")

    about_src = pick_about_source(albums)
    print("\n=== About photo ===")
    if about_src:
        print(f"  source: {about_src.name}")
        save_webp(about_src, WEB / "about-zefir.webp", ABOUT_MAX, FULL_QUALITY)
    else:
        print("  skip: zefir album missing")

    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    write_js_global(ROOT / "works-manifest.js", "SLADOST_WORKS_MANIFEST", manifest)

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
