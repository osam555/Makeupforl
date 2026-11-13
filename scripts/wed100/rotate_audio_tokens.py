#!/usr/bin/env python3
"""잠긴 문항 답변 음성의 다운로드 토큰을 새로 발급하고 Firestore audio 주소를 바꾼다.

왜: 화면이 쓰는 음성 주소는 ?token= 이 붙은 Firebase 다운로드 주소라 Storage 규칙을
닫아도 그대로 열린다. 그런데 그 주소들이 공개 GitHub 저장소의 시드 JSON 과 옛 어드민
JS 파일에 이미 실려 나갔다(2026-11-07 확인). 토큰을 갈면 옛 주소는 그 순간부터 403 이다.
구매자는 /api/wed100/answer 가 Firestore 에서 새 주소를 읽어 주므로 영향이 없다.

무료 문항(site_config/wed100.freeQna)은 손대지 않는다 — 누구나 듣는 음성이고,
공개 페이지가 정적으로 구운 HTML 에 주소가 들어 있어 갈면 재검증 전까지 재생이 끊긴다.

주의: wed100_versions 스냅샷에 남은 옛 audio 주소는 죽은 링크가 된다. 옛 판으로
되돌릴 때 음성 주소는 이 스크립트를 다시 돌리거나 어드민에서 다시 붙인다.
Storage 규칙(firebase/storage.rules)을 먼저 배포한 뒤 돌릴 것 — 순서가 바뀌면
토큰 없이 받는 길이 열린 채로 토큰만 간 셈이 된다.

사용법 (기본은 보기만 한다)
  GOOGLE_APPLICATION_CREDENTIALS=<키> python3 scripts/wed100/rotate_audio_tokens.py
  GOOGLE_APPLICATION_CREDENTIALS=<키> python3 scripts/wed100/rotate_audio_tokens.py --apply
  ... rotate_audio_tokens.py --apply p4-01 p4-02        # 일부만
"""
import sys
import uuid
from urllib.parse import quote, unquote, urlparse

PROJECT = "makeupforl"
BUCKET = "makeupforl.firebasestorage.app"
PREFIX = f"https://firebasestorage.googleapis.com/v0/b/{BUCKET}/o/"


def object_path(url: str) -> str | None:
    # .../o/wed100%2Faudio%2Fp4-01.mp3?alt=media&token=… → wed100/audio/p4-01.mp3
    if not url.startswith(PREFIX):
        return None
    return unquote(urlparse(url).path.split("/o/", 1)[1])


def main():
    apply = "--apply" in sys.argv
    only = {a for a in sys.argv[1:] if not a.startswith("--")}
    from google.cloud import firestore, storage

    db = firestore.Client(project=PROJECT)
    cfg = db.collection("site_config").document("wed100").get().to_dict() or {}
    free = set(cfg.get("freeQna") or [])
    if not free:
        # 무료 목록을 못 읽으면 무엇이 잠겼는지 모른다 — 무료 음성까지 끊을 수 있으니 멈춘다
        sys.exit("site_config/wed100.freeQna 를 읽지 못했습니다. 멈춥니다.")

    bucket = storage.Client(project=PROJECT).bucket(BUCKET)
    col = db.collection("wed100_questions")
    done = skipped = 0
    for doc in col.stream():
        slug = doc.id
        if slug in free or (only and slug not in only):
            continue
        url = (doc.to_dict() or {}).get("audio") or ""
        path = object_path(url)
        if not path:
            skipped += 1
            continue
        blob = bucket.get_blob(path)
        if blob is None:
            print(f"  {slug:<12} 파일 없음 — {path}")
            skipped += 1
            continue
        token = str(uuid.uuid4())
        new_url = f"{PREFIX}{quote(path, safe='')}?alt=media&token={token}"
        print(f"  {slug:<12} {path}")
        if apply:
            # 토큰 목록을 통째로 갈아 끼운다 — 옛 토큰을 남기면 옛 주소가 계속 열린다
            blob.metadata = {**(blob.metadata or {}), "firebaseStorageDownloadTokens": token}
            blob.patch()
            # updatedAt 은 건드리지 않는다 — 본문 수정 시각과 음성 시각 비교(isStale)가 흔들린다
            col.document(slug).update({"audio": new_url})
        done += 1

    verb = "바꿈" if apply else "바꿀 대상"
    print(f"{verb} {done}건, 건너뜀 {skipped}건 (무료 {len(free)}건 제외)")
    if not apply:
        print("보기만 했습니다. 실제로 바꾸려면 --apply")


if __name__ == "__main__":
    main()
