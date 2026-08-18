#!/usr/bin/env python3
"""재생성한 음성을 Firebase Storage 에 올리고 Firestore 타임코드를 갱신한다.

3_gen_tts.py 로 음성을 다시 만든 뒤 실행하면, 운영 사이트가 새 음성과
새 자막 타임코드를 쓰게 된다. 저장소에 커밋한 public/wed100/audio/*.mp3 는
Firebase 미설정 환경의 폴백으로 남는다.

DB 에 없는 문항(삭제된 것)은 절대 되살리지 않는다.

사용법
  GOOGLE_APPLICATION_CREDENTIALS=<서비스계정.json> \
    python3 scripts/wed100/6_upload_audio.py            # 전체
  ... python3 scripts/wed100/6_upload_audio.py p1-01 p1-02   # 일부만
  ... python3 scripts/wed100/6_upload_audio.py --dry
"""
import json
import os
import sys
import uuid

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "src", "data", "wed100.json")
AUDIO = os.path.join(ROOT, "public", "wed100", "audio")
PROJECT = "makeupforl"
BUCKET = "makeupforl.firebasestorage.app"


def download_url(bucket: str, path: str, token: str) -> str:
    from urllib.parse import quote
    return (f"https://firebasestorage.googleapis.com/v0/b/{bucket}/o/"
            f"{quote(path, safe='')}?alt=media&token={token}")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv

    from google.cloud import firestore, storage

    data = json.load(open(DATA, encoding="utf-8"))
    items = data["items"]
    if args:
        items = [x for x in items if x["slug"] in args]

    db = firestore.Client(project=PROJECT)
    col = db.collection("wed100_questions")
    live = {d.id for d in col.select([]).stream()}
    bucket = storage.Client(project=PROJECT).bucket(BUCKET)

    done = skipped = missing = 0
    for it in items:
        slug = it["slug"]
        mp3 = os.path.join(AUDIO, f"{slug}.mp3")
        if slug not in live:
            skipped += 1
            continue
        if not os.path.exists(mp3):
            missing += 1
            continue

        path = f"wed100/audio/{slug}.mp3"
        token = str(uuid.uuid4())
        url = download_url(BUCKET, path, token)

        if not dry:
            blob = bucket.blob(path)
            blob.metadata = {"firebaseStorageDownloadTokens": token}
            blob.cache_control = "public,max-age=31536000"
            blob.upload_from_filename(mp3, content_type="audio/mpeg")

            col.document(slug).update({
                "audio": url,
                "duration": it.get("duration"),
                "questionAudio": it.get("questionAudio"),
                "cues": [
                    {"i": i, "ko": c["ko"], "en": c.get("en"),
                     "start": c.get("start"), "end": c.get("end")}
                    for i, c in enumerate(it["cues"])
                ],
            })
        done += 1
        print(f"  {slug:<12} {it.get('duration', 0):6.1f}s / {len(it['cues'])}큐")

    print(f"\n[{'DRY' if dry else 'OK'}] 업로드·갱신 {done}문"
          + (f" · DB 에 없어 건너뜀 {skipped}문" if skipped else "")
          + (f" · mp3 없음 {missing}문" if missing else ""))
    if not dry:
        print("     페이지 캐시(1시간)를 즉시 갱신하려면 재배포하거나 저장 API 로 한 번 저장하세요")


if __name__ == "__main__":
    main()
