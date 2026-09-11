#!/usr/bin/env python3
"""Firestore site_config/seo-keywords → src/data/seo-keywords.json 동기화.

어드민에서 고친 목표 검색어를 시드에 되돌려 넣는다. 푸시 전에 실행한다.

    GOOGLE_APPLICATION_CREDENTIALS=<키> python3 scripts/sync-seo-keywords.py

왜 필요한가. 목록은 Firestore 우선 · 코드 시드 폴백이다. 어드민에서 검색어를
더하거나 우선순위를 바꿔도 시드는 그대로라, Firestore 가 잠깐이라도 안 되는
순간 사이트는 **옛 목록으로 조용히 되돌아간다**. 화면은 멀쩡히 뜨는데 노리는
말이 다른 상태가 되고, 아무도 눈치채지 못한다. wed100 의 sync_seed.py 와 같은
이유이고 같은 자리다.

덮어쓰기 전에 두 가지를 본다:

  - Firestore 에 목록이 아예 없으면 **아무것도 하지 않는다.** 빈 목록으로 시드를
    지우면 폴백이 폴백 구실을 못 한다. 아직 한 번도 저장한 적 없는 상태와
    "다 지웠다" 는 구별되지 않으므로, 덮어쓰지 않는 쪽이 안전하다.
  - 무엇이 바뀌는지 찍어 준다. 되돌림은 조용히 지나가면 안 되는 일이다 —
    무엇이 시드에 들어갔는지 모른 채 커밋하면 리뷰가 의미를 잃는다.
"""

from __future__ import annotations

import json
import os
import sys

from google.cloud import firestore

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src/data/seo-keywords.json")

# 화면과 서버가 쓰는 칸만 남긴다. updatedAt 같은 운영 값은 시드에 들어갈 것이 아니다
FIELDS = ("term", "volume", "owner", "why", "priority", "measuredAt")


def main() -> None:
    db = firestore.Client(project="makeupforl")
    snap = db.collection("site_config").document("seo-keywords").get()
    rows = (snap.to_dict() or {}).get("items") if snap.exists else None

    if not rows:
        print(
            "Firestore 에 목록이 없습니다 — 시드를 건드리지 않습니다.\n"
            "어드민(키워드 화면)에서 한 번도 저장한 적이 없는 상태로 보입니다.",
            file=sys.stderr,
        )
        sys.exit(1)

    items = [{k: r[k] for k in FIELDS if r.get(k) is not None} for r in rows]

    before = []
    if os.path.exists(OUT):
        before = json.load(open(OUT, encoding="utf-8"))

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(json.dumps(items, ensure_ascii=False, indent=2) + "\n")

    old = {x["term"]: x for x in before}
    new = {x["term"]: x for x in items}
    for term in sorted(set(old) | set(new)):
        if term not in old:
            print(f"  + {term}")
        elif term not in new:
            print(f"  - {term}")
        elif old[term] != new[term]:
            diff = [k for k in set(old[term]) | set(new[term]) if old[term].get(k) != new[term].get(k)]
            print(f"  ~ {term}  ({', '.join(sorted(diff))})")

    print(f"synced {len(items)} keywords → {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
