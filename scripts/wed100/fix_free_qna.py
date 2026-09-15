#!/usr/bin/env python3
"""Firestore site_config/wed100 의 무료 문항(freeQna)을 확정 목록으로 맞춘다.

    GOOGLE_APPLICATION_CREDENTIALS=<키> python3 scripts/wed100/fix_free_qna.py
    GOOGLE_APPLICATION_CREDENTIALS=<키> python3 scripts/wed100/fix_free_qna.py --dry-run

왜 스크립트인가. 무료 문항은 어드민(공개 범위 화면)이 Firestore 에 직접 쓰고,
코드에는 기본값(FREE_QNA_DEFAULT)만 폴백으로 있다. 라이브 값이 어긋나면(옆 번호를
잘못 골랐거나 옛 목록이 남았거나) 코드는 멀쩡한데 화면만 엉뚱한 문항이 열린다.
어드민에서 고칠 수 있는 일이지만, 확정 목록을 저장소에 남겨 두고 한 번에 되돌릴
수 있게 스크립트로 둔다. 첫 화면 슬라이드도 이 목록을 그대로 따른다(page.tsx).

무엇을 넣나. 2026-09-15 원장님 확정(제목으로 확인):
  프롤로그·에필로그 + 파트 1~5 하나씩
  p1-06 1:1 사전 컨설팅 / p2-05 시연 만족도 / p3-15 눈물이 날 것 같은데 /
  p4-07 둥근 얼굴형 혼주 머리 / p5-13 귀걸이·목걸이

한 번 맞추면 다시 돌려도 안전하다 — 이미 같으면 아무것도 쓰지 않는다.
"""

from __future__ import annotations

import sys

from google.cloud import firestore

# 확정 무료 문항. FREE_QNA_DEFAULT(src/lib/wed100Access.ts) 와 같아야 한다.
FREE_QNA = [
    "prologue",
    "epilogue",
    "p1-06",
    "p2-05",
    "p3-15",
    "p4-07",
    "p5-13",
]


def main() -> None:
    dry = "--dry-run" in sys.argv[1:]

    db = firestore.Client(project="makeupforl")
    ref = db.collection("site_config").document("wed100")
    snap = ref.get()

    if not snap.exists:
        print(
            "site_config/wed100 문서가 없습니다 — 아직 공개 범위를 저장한 적이 "
            "없는 상태로 보입니다. 어드민에서 먼저 저장하세요.",
            file=sys.stderr,
        )
        sys.exit(1)

    before = [str(x) for x in (snap.to_dict() or {}).get("freeQna") or []]
    print("현재 freeQna:", before)

    if before == FREE_QNA:
        print("바꿀 것이 없습니다 — 이미 확정 목록입니다.")
        return

    print("바뀔 freeQna:", FREE_QNA)
    for s in FREE_QNA:
        if s not in before:
            print(f"  + {s}")
    for s in before:
        if s not in FREE_QNA:
            print(f"  - {s}")

    if dry:
        print("\n--dry-run 이므로 저장하지 않았습니다.")
        return

    ref.set({"freeQna": FREE_QNA}, merge=True)
    print("\n저장했습니다. 공개 페이지는 1시간 재검증 주기 안에 반영됩니다 "
          "(즉시 반영하려면 어드민 공개 범위에서 한 번 더 [저장]).")


if __name__ == "__main__":
    main()
