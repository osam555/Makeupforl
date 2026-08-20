#!/usr/bin/env python3
"""문항마다 대표 사진을 배정한다.

배정 우선순위
  1. 어드민에서 손으로 지정한 문항 (photoAuto == false) — 절대 건드리지 않는다
  2. scripts/wed100/photo_map.json — 질문 내용을 보고 골라 둔 표
  3. 파트별 자동 순환 배정 (표에 없는 새 문항용)

파트 주제에 맞는 사진 분류를 풀로 잡고, 파트 안에서 순서대로 돌려가며 배정한다.
사진이 늘어나면 다시 돌리기만 하면 되고, 어드민에서 손으로 지정한 문항
(photoAuto == false)은 절대 건드리지 않는다.

사용법
  python3 scripts/wed100/5_assign_photos.py              # src/data/wed100.json 갱신
  python3 scripts/wed100/5_assign_photos.py --firestore  # 운영 DB 에도 반영
  python3 scripts/wed100/5_assign_photos.py --reset      # 수동 지정까지 전부 자동으로 되돌림
  python3 scripts/wed100/5_assign_photos.py --dry        # 미리보기만

운영 DB 반영 시
  GOOGLE_APPLICATION_CREDENTIALS=<서비스계정.json> python3 ... --firestore
"""
import argparse
import json
import os
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "src", "data", "wed100.json")
CATALOG = os.path.join(ROOT, "src", "data", "wed100-photos.json")
PHOTO_MAP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "photo_map.json")

# 파트별로 어울리는 사진 분류 (앞에 적힌 것이 우선)
PART_CATS = {
    0: ["portrait"],                  # 프롤로그
    1: ["portrait"],                  # 업체 선정 및 예약 — 완성컷으로 결과물을 보여준다
    2: ["portrait"],                  # 사전 컨설팅 및 준비
    3: ["portrait"],                  # 혼주 메이크업 — 얼굴이 본문과 직결
    4: ["hair"],                      # 혼주 헤어스타일
    5: ["hanbok", "portrait"],        # 의상·퍼스널컬러·액세서리
    6: ["portrait", "hair"],          # 결혼식 당일
    7: ["portrait"],                  # 에필로그
}
FALLBACK = ["portrait", "hair", "hanbok"]


def load(path):
    return json.load(open(path, encoding="utf-8"))


def pool_for(part: int, by_cat: dict) -> list:
    for cats in (PART_CATS.get(part, []), FALLBACK):
        got = [p for c in cats for p in by_cat.get(c, [])]
        if got:
            return got
    return []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--firestore", action="store_true", help="운영 DB 에도 반영")
    ap.add_argument("--reset", action="store_true", help="수동 지정도 자동 배정으로 되돌림")
    ap.add_argument("--dry", action="store_true", help="바꾸지 않고 결과만 출력")
    ap.add_argument("--no-map", action="store_true", help="photo_map.json 을 무시하고 순환 배정만")
    a = ap.parse_args()

    if not os.path.exists(CATALOG):
        sys.exit("카탈로그가 없습니다. 먼저 4_build_photos.py 를 실행하세요.")

    photos = [p for p in load(CATALOG)["photos"] if p.get("enabled", True)]
    if not photos:
        sys.exit("사용 가능한 사진이 없습니다.")
    by_cat = defaultdict(list)
    for p in photos:
        by_cat[p["cat"]].append(p)
    by_name = {p["name"]: p for p in photos}

    curated = {}
    if not a.no_map and os.path.exists(PHOTO_MAP):
        curated = load(PHOTO_MAP).get("map", {})

    data = load(DATA)
    items = data["items"]

    per_part = defaultdict(int)
    n_auto = n_curated = n_kept = n_missing = 0
    changes = []

    for it in sorted(items, key=lambda x: (x["part"], x["n"])):
        part = it["part"]

        # 손으로 지정한 문항은 그대로 둔다
        if it.get("photoAuto") is False and not a.reset:
            name = it.get("photo")
            if name and name not in by_name:
                n_missing += 1
                print(f"  ! {it['slug']}: 수동 지정 사진 '{name}' 이 카탈로그에 없습니다")
            else:
                n_kept += 1
            continue

        # 내용에 맞춰 골라 둔 표가 먼저다
        picked = curated.get(it["slug"], {}).get("photo")
        if picked and picked in by_name:
            photo = by_name[picked]
            n_curated += 1
        else:
            if picked:
                print(f"  ! {it['slug']}: 표의 사진 '{picked}' 이 카탈로그에 없습니다")
            pool = pool_for(part, by_cat)
            if not pool:
                continue
            # 파트마다 시작점을 달리해 같은 사진이 파트 경계에서 붙는 걸 줄인다
            photo = pool[(per_part[part] + part) % len(pool)]
            per_part[part] += 1

        before = it.get("heroImage")
        if before != photo["hero"]:
            changes.append((it["slug"], it.get("photo"), photo["name"]))
        it["photo"] = photo["name"]
        it["photoAuto"] = True
        it["heroImage"] = photo["hero"]
        it["thumbImage"] = photo["thumb"]
        n_auto += 1

    print(f"배정 {n_auto}문 (표 {n_curated}문 · 순환 {n_auto - n_curated}문) · 수동 유지 {n_kept}문"
          + (f" · 누락 {n_missing}문" if n_missing else ""))
    for part in sorted(per_part):
        pool = pool_for(part, by_cat)
        print(f"  PART {part}: {per_part[part]}문 ← {len(pool)}장"
              f" ({', '.join(PART_CATS.get(part, FALLBACK))})")
    if changes:
        print(f"  변경 {len(changes)}건 (앞 5건)")
        for slug, old, new in changes[:5]:
            print(f"    {slug}: {old or '자동생성 SVG'} → {new}")

    if a.dry:
        print("\n[DRY] 저장하지 않았습니다.")
        return

    json.dump(data, open(DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n[OK] {os.path.relpath(DATA, ROOT)} 갱신")

    if a.firestore:
        from google.cloud import firestore
        db = firestore.Client(project="makeupforl")
        col = db.collection("wed100_questions")

        # 삭제된 문항을 되살리지 않도록, DB 에 이미 있는 문서만 갱신한다
        live = {d.id for d in col.select([]).stream()}

        batch, n, skipped = db.batch(), 0, 0
        for it in items:
            if not it.get("photo"):
                continue
            if it["slug"] not in live:
                skipped += 1
                continue
            batch.update(col.document(it["slug"]), {
                "photo": it["photo"],
                "photoAuto": it.get("photoAuto", True),
                "heroImage": it["heroImage"],
                "thumbImage": it["thumbImage"],
            })
            n += 1
            if n % 400 == 0:
                batch.commit()
                batch = db.batch()
        batch.commit()
        print(f"[OK] Firestore {n}문 반영"
              + (f" · DB 에 없는 {skipped}문 건너뜀" if skipped else ""))
        print("     저장 API 로 한 번 재저장하거나 재배포해 페이지 캐시를 갱신하세요")


if __name__ == "__main__":
    main()
