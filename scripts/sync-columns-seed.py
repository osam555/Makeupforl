#!/usr/bin/env python3
"""Firestore columns → src/data/columns.json 동기화.

어드민에서 올리거나 고친 CEO 칼럼을 시드에 되돌려 넣는다. 푸시 전에 실행한다.

    GOOGLE_APPLICATION_CREDENTIALS=<키> python3 scripts/sync-columns-seed.py

왜 필요한가. 칼럼도 Firestore 우선 · 코드 시드 폴백이다(getColumns). 어드민에서
글을 올려도 시드는 그대로라, Firestore 가 잠깐이라도 안 되는 순간 사이트는 **옛
목록으로 조용히 되돌아간다**. 화면은 멀쩡히 뜨는데 방금 올린 글이 사라진 상태가
되고 아무도 눈치채지 못한다. wed100 의 sync_seed.py, seo-keywords 의 것과 같은
이유이고 같은 자리다.

덮어쓰기 전에 두 가지를 본다:

  - Firestore 에 칼럼이 아예 없으면 **아무것도 하지 않는다.** 빈 목록으로 시드를
    지우면 폴백이 폴백 구실을 못 한다.
  - 무엇이 바뀌는지 찍어 준다 — 무엇이 시드에 들어갔는지 모른 채 커밋하면
    리뷰가 의미를 잃는다.
"""

from __future__ import annotations

import json
import os
import sys

from google.cloud import firestore

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src/data/columns.json")

# 화면·서버가 쓰는 칸만 남긴다. updatedBy 같은 운영 값은 시드에 들어갈 것이 아니다
FIELDS = (
    "slug",
    "title",
    "description",
    "lead",
    "body",
    "keywords",
    "heroImage",
    "author",
    "publishedAt",
    "updatedAt",
    "relatedHubs",
    "relatedQna",
    "published",
)


def main() -> None:
    db = firestore.Client(project="makeupforl")
    docs = list(db.collection("columns").stream())
    rows = [d.to_dict() for d in docs]

    if not rows:
        print(
            "Firestore 에 칼럼이 없습니다 — 시드를 건드리지 않습니다.\n"
            "어드민(CEO 칼럼 화면)에서 한 번도 저장한 적이 없는 상태로 보입니다.",
            file=sys.stderr,
        )
        sys.exit(1)

    items = [{k: r[k] for k in FIELDS if r.get(k) is not None} for r in rows]
    # 런타임과 같은 순서 — 최신 글이 위로
    items.sort(key=lambda x: (x.get("publishedAt", ""), x.get("slug", "")), reverse=True)

    before = {"meta": {}, "items": []}
    if os.path.exists(OUT):
        before = json.load(open(OUT, encoding="utf-8"))

    # meta 는 시드에만 있는 표제라 그대로 지킨다
    out = {"meta": before.get("meta", {}), "items": items}
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")

    old = {x["slug"]: x for x in before.get("items", [])}
    new = {x["slug"]: x for x in items}
    for slug in sorted(set(old) | set(new)):
        if slug not in old:
            print(f"  + {slug}")
        elif slug not in new:
            print(f"  - {slug}")
        elif old[slug] != new[slug]:
            diff = [k for k in set(old[slug]) | set(new[slug]) if old[slug].get(k) != new[slug].get(k)]
            print(f"  ~ {slug}  ({', '.join(sorted(diff))})")

    print(f"\n{len(items)}개 칼럼을 {os.path.relpath(OUT, ROOT)} 에 썼습니다.")


if __name__ == "__main__":
    main()
