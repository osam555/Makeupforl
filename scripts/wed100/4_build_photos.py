#!/usr/bin/env python3
"""사진 폴더 → wed100 대표 이미지(hero/thumb) 빌더.

사진을 폴더에 넣고 이 스크립트만 다시 돌리면 됩니다.
새로 들어온 사진만 처리하고, 이미 만들어 둔 것과 손으로 고친 값은 건드리지 않습니다.

폴더 규칙 (권장)
  photos/
    인물/   ← 얼굴이 나온 완성컷      (portrait)
    헤어/   ← 올림머리·쪽머리         (hair)
    한복/   ← 저고리·노리개 디테일     (hanbok)
  하위 폴더 없이 그냥 넣어도 됩니다. 이때 분류는 'portrait' 로 잡히니
  src/data/wed100-photos.json 에서 cat 만 고쳐 주세요 (다시 돌려도 유지됩니다).

하는 일
  1. 사진마다 얼굴을 자동으로 찾아 크롭 기준점(focus)을 잡는다
  2. hero 1600x900 / thumb 800x800 WebP 생성
     - 가로 사진은 기준점 중심으로 잘라내고
     - 세로 사진은 얼굴이 잘리므로, 같은 사진을 흐리게 깐 배경 위에 원본을 통째로 얹는다
  3. 카탈로그(src/data/wed100-photos.json) 갱신

사용법
  python3 scripts/wed100/4_build_photos.py                  # photos/ 를 읽는다
  python3 scripts/wed100/4_build_photos.py --src ~/사진폴더
  python3 scripts/wed100/4_build_photos.py --force          # 이미 만든 것도 다시 만든다
  python3 scripts/wed100/4_build_photos.py --refocus        # focus 를 다시 자동 검출 (수동 조정값도 덮어씀)
"""
import argparse
import json
import os
import sys

from PIL import Image, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CATALOG = os.path.join(ROOT, "src", "data", "wed100-photos.json")
OUT_HERO = os.path.join(ROOT, "public", "wed100", "photo", "hero")
OUT_THUMB = os.path.join(ROOT, "public", "wed100", "photo", "thumb")

HERO_W, HERO_H = 1600, 900
THUMB = 800
QUALITY = 82
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}

# 하위 폴더 이름 → 분류
CAT_DIRS = {
    "인물": "portrait", "portrait": "portrait", "완성컷": "portrait",
    "헤어": "hair", "hair": "hair", "머리": "hair",
    "한복": "hanbok", "hanbok": "hanbok", "의상": "hanbok",
}
CATS = ["portrait", "hair", "hanbok"]


# ---------------------------------------------------------------- 얼굴 검출

def detect_focus(path: str) -> tuple:
    """얼굴을 찾아 크롭 기준점 (x, y) 를 0~1 비율로 돌려준다.

    못 찾으면 인물 사진의 통계적 안전값(가로 중앙, 위에서 38%)을 쓴다.
    """
    try:
        import cv2
    except ImportError:
        return (0.5, 0.38)

    img = cv2.imread(path)
    if img is None:
        return (0.5, 0.38)
    h, w = img.shape[:2]
    scale = 900 / max(h, w)
    if scale < 1:
        img = cv2.resize(img, (int(w * scale), int(h * scale)))
    gray = cv2.equalizeHist(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
    gh, gw = gray.shape[:2]

    boxes = []
    for name in ("haarcascade_frontalface_default.xml",
                 "haarcascade_frontalface_alt2.xml",
                 "haarcascade_profileface.xml"):
        cc = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, name))
        found = cc.detectMultiScale(gray, 1.1, 5, minSize=(int(gw * .06), int(gh * .06)))
        boxes.extend(found)
        if len(boxes):
            break
    if not len(boxes):
        # 좌우 반전해서 반대쪽 옆얼굴도 한 번 더
        cc = cv2.CascadeClassifier(
            os.path.join(cv2.data.haarcascades, "haarcascade_profileface.xml"))
        flipped = cv2.flip(gray, 1)
        for (x, y, fw, fh) in cc.detectMultiScale(
                flipped, 1.1, 5, minSize=(int(gw * .06), int(gh * .06))):
            boxes.append((gw - x - fw, y, fw, fh))
    if not len(boxes):
        return (0.5, 0.38)

    x, y, fw, fh = max(boxes, key=lambda b: b[2] * b[3])  # 가장 큰 얼굴
    return (round((x + fw / 2) / gw, 3), round((y + fh / 2) / gh, 3))


# ---------------------------------------------------------------- 이미지 생성

def crop_to(im: Image.Image, ratio: float, fx: float, fy: float) -> Image.Image:
    """원본 안에 들어가는 가장 큰 ratio 사각형을 기준점 중심으로 잘라낸다."""
    w, h = im.size
    if w / h >= ratio:          # 원본이 더 넓다 → 높이를 다 쓰고 좌우를 자른다
        tw, th = int(round(h * ratio)), h
    else:                       # 원본이 더 좁다 → 너비를 다 쓰고 위아래를 자른다
        tw, th = w, int(round(w / ratio))
    tw, th = min(tw, w), min(th, h)
    x = min(max(int(w * fx - tw / 2), 0), w - tw)
    y = min(max(int(h * fy - th / 2), 0), h - th)
    return im.crop((x, y, x + tw, y + th))


def make_hero(im: Image.Image, fx: float, fy: float) -> Image.Image:
    w, h = im.size
    if w / h >= 1.35:                      # 가로 사진 — 그냥 잘라낸다
        return crop_to(im, HERO_W / HERO_H, fx, fy).resize((HERO_W, HERO_H), Image.LANCZOS)
    # 세로·정사각 사진 — 잘라내면 얼굴이 날아가므로 블러 배경 위에 얹는다
    bg = crop_to(im, HERO_W / HERO_H, fx, fy).resize((HERO_W, HERO_H), Image.LANCZOS)
    bg = bg.filter(ImageFilter.GaussianBlur(38))
    bg = ImageEnhance.Brightness(bg).enhance(1.12)
    bg = ImageEnhance.Color(bg).enhance(0.55)
    fg = im.copy()
    fg.thumbnail((int(HERO_H * w / h), HERO_H), Image.LANCZOS)
    bg.paste(fg, ((HERO_W - fg.width) // 2, 0))
    return bg


def make_thumb(im: Image.Image, fx: float, fy: float) -> Image.Image:
    # 썸네일은 정사각이라 얼굴이 중앙에 오도록 살짝 위를 본다
    return crop_to(im, 1.0, fx, max(0.0, fy - 0.03)).resize((THUMB, THUMB), Image.LANCZOS)


# ---------------------------------------------------------------- 카탈로그

def load_catalog() -> dict:
    if os.path.exists(CATALOG):
        return json.load(open(CATALOG, encoding="utf-8"))
    return {"photos": []}


def next_name(cat: str, used: set) -> str:
    i = 1
    while f"{cat}-{i:02d}" in used:
        i += 1
    return f"{cat}-{i:02d}"


def scan(src: str):
    """(원본경로, 분류) 목록. 하위 폴더 이름이 분류가 된다."""
    out = []
    for dirpath, _dirnames, filenames in os.walk(src):
        rel = os.path.relpath(dirpath, src)
        cat = CAT_DIRS.get(os.path.basename(dirpath), None) if rel != "." else None
        for fn in sorted(filenames):
            if fn.startswith(".") or os.path.splitext(fn)[1].lower() not in EXTS:
                continue
            out.append((os.path.join(dirpath, fn), cat))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=os.environ.get("WED100_PHOTOS_DIR",
                                                    os.path.join(ROOT, "photos")))
    ap.add_argument("--force", action="store_true", help="이미 만든 파일도 다시 생성")
    ap.add_argument("--refocus", action="store_true", help="focus 를 다시 자동 검출")
    a = ap.parse_args()

    if not os.path.isdir(a.src):
        sys.exit(f"사진 폴더가 없습니다: {a.src}\n  --src 로 경로를 지정하세요.")

    os.makedirs(OUT_HERO, exist_ok=True)
    os.makedirs(OUT_THUMB, exist_ok=True)

    cat_data = load_catalog()
    by_src = {p["src"]: p for p in cat_data["photos"]}
    used = {p["name"] for p in cat_data["photos"]}

    added = updated = skipped = 0
    for path, dircat in scan(a.src):
        key = os.path.basename(path)
        entry = by_src.get(key)

        if entry is None:
            cat = dircat or "portrait"
            entry = {
                "name": next_name(cat, used),
                "src": key,
                "cat": cat,
                "focus": None,
                "enabled": True,
                "note": "",
            }
            used.add(entry["name"])
            cat_data["photos"].append(entry)
            by_src[key] = entry
            added += 1
        elif dircat and entry["cat"] != dircat and not entry.get("catLocked"):
            entry["cat"] = dircat
            updated += 1

        # focusLocked 는 손으로 잡아 준 기준점 — 자동 검출이 덮어쓰지 않는다
        if entry.get("focus") is None or (a.refocus and not entry.get("focusLocked")):
            entry["focus"] = list(detect_focus(path))

        hero_p = os.path.join(OUT_HERO, entry["name"] + ".webp")
        thumb_p = os.path.join(OUT_THUMB, entry["name"] + ".webp")
        if not a.force and os.path.exists(hero_p) and os.path.exists(thumb_p):
            skipped += 1
            continue

        im = Image.open(path).convert("RGB")
        fx, fy = entry["focus"]
        make_hero(im, fx, fy).save(hero_p, quality=QUALITY, method=6)
        make_thumb(im, fx, fy).save(thumb_p, quality=QUALITY, method=6)
        entry["w"], entry["h"] = im.size
        print(f"  {entry['name']:<12} {entry['cat']:<9} focus=({fx:.2f},{fy:.2f})  {key}")

    cat_data["photos"].sort(key=lambda p: (CATS.index(p["cat"]) if p["cat"] in CATS else 9,
                                           p["name"]))
    for p in cat_data["photos"]:
        p["hero"] = f"/wed100/photo/hero/{p['name']}.webp"
        p["thumb"] = f"/wed100/photo/thumb/{p['name']}.webp"

    json.dump(cat_data, open(CATALOG, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    n_on = len([p for p in cat_data["photos"] if p.get("enabled", True)])
    print(f"\n[OK] 신규 {added} · 분류변경 {updated} · 건너뜀 {skipped}"
          f" · 사용 가능 {n_on}/{len(cat_data['photos'])}장")
    for c in CATS:
        k = len([p for p in cat_data["photos"] if p["cat"] == c and p.get("enabled", True)])
        print(f"     {c:<9} {k}장")
    print(f"     카탈로그 → {os.path.relpath(CATALOG, ROOT)}")
    print("     다음: python3 scripts/wed100/5_assign_photos.py")


if __name__ == "__main__":
    main()
