#!/usr/bin/env python3
"""대표 사진을 Firebase Storage 에 올리고 Firestore 의 heroImage/thumbImage 를 갱신한다.

운영 사이트는 Firestore 를 먼저 읽기 때문에, 저장소에 사진을 커밋하고 배포하기
전이라도 이 스크립트만 돌리면 바로 반영된다. (배포 전에 Firestore 만 로컬 경로로
바꿔 두면 이미지가 404 가 된다 — 그래서 Storage URL 을 쓴다.)

저장소의 public/wed100/photo/*.webp 는 Firebase 미설정 환경의 폴백으로 남는다.

사용법
  GOOGLE_APPLICATION_CREDENTIALS=<서비스계정.json> \
    python3 scripts/wed100/7_upload_photos.py
  ... --dry        업로드하지 않고 확인만
  ... --local      Storage 대신 로컬 경로(/wed100/photo/...)로 되돌린다 (배포 후 정리용)
"""
import json
import os
import sys
import uuid
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "src", "data", "wed100.json")
CATALOG = os.path.join(ROOT, "src", "data", "wed100-photos.json")
PUBLIC = os.path.join(ROOT, "public")
PROJECT = "makeupforl"
BUCKET = "makeupforl.firebasestorage.app"


def download_url(path: str, token: str) -> str:
    return (f"https://firebasestorage.googleapis.com/v0/b/{BUCKET}/o/"
            f"{quote(path, safe='')}?alt=media&token={token}")


def main():
    dry = "--dry" in sys.argv
    local = "--local" in sys.argv

    from google.cloud import firestore, storage

    photos = json.load(open(CATALOG, encoding="utf-8"))["photos"]
    data = json.load(open(DATA, encoding="utf-8"))

    db = firestore.Client(project=PROJECT)
    col = db.collection("wed100_questions")
    live = {d.id for d in col.select([]).stream()}

    # 사진 이름 → 실제로 쓸 URL
    url_map = {}
    if local:
        for p in photos:
            url_map[p["name"]] = (p["hero"], p["thumb"])
    else:
        bucket = storage.Client(project=PROJECT).bucket(BUCKET)
        for p in photos:
            pair = []
            for kind in ("hero", "thumb"):
                rel = p[kind].lstrip("/")            # wed100/photo/hero/x.webp
                src = os.path.join(PUBLIC, rel)
                if not os.path.exists(src):
                    print(f"  ! 파일 없음: {rel}")
                    pair.append(p[kind])
                    continue
                token = str(uuid.uuid4())
                if not dry:
                    blob = bucket.blob(rel)
                    blob.metadata = {"firebaseStorageDownloadTokens": token}
                    blob.cache_control = "public,max-age=31536000"
                    blob.upload_from_filename(src, content_type="image/webp")
                pair.append(download_url(rel, token))
            url_map[p["name"]] = tuple(pair)
            print(f"  {p['name']:<12} {p['cat']}")

    batch, n, skip = db.batch(), 0, 0
    for it in data["items"]:
        name = it.get("photo")
        if not name or name not in url_map:
            continue
        if it["slug"] not in live:
            skip += 1
            continue
        hero, thumb = url_map[name]
        if not dry:
            batch.update(col.document(it["slug"]),
                         {"heroImage": hero, "thumbImage": thumb})
        n += 1
        if n % 400 == 0 and not dry:
            batch.commit()
            batch = db.batch()
    if not dry:
        batch.commit()

    where = "로컬 경로" if local else "Storage URL"
    print(f"\n[{'DRY' if dry else 'OK'}] {where} 로 {n}문 갱신"
          + (f" · DB 에 없어 건너뜀 {skip}문" if skip else ""))


if __name__ == "__main__":
    main()
