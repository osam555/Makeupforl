#!/usr/bin/env python3
"""Firestore site_config/wed100 의 무료 문항(freeQna) 오배정을 바로잡는다.

    GOOGLE_APPLICATION_CREDENTIALS=<키> python3 scripts/wed100/fix_free_qna.py
    GOOGLE_APPLICATION_CREDENTIALS=<키> python3 scripts/wed100/fix_free_qna.py --dry-run

왜 스크립트인가. 무료 문항은 어드민(공개 범위 화면)이 Firestore 에 직접 쓰고,
코드에는 기본값(FREE_QNA_DEFAULT)만 폴백으로 있다. 라이브 값이 바로 옆 번호로
잘못 들어가면(p3-14 대신 p3-13 처럼 인접 문항을 잘못 체크) 코드는 멀쩡한데
화면만 엉뚱한 문항이 열린다. 어드민에서 두 번 클릭으로 고칠 수 있는 일이지만,
무엇을 어떻게 되돌렸는지 저장소에 남겨 두려고 스크립트로 만든다.

왜 통째로 안 덮고 짝만 바꾸나. freeQna 에는 프롤로그·에필로그처럼 파트 밖
항목과 고른 순서가 함께 들어 있다. 배열 전체를 기본값으로 밀면 그런 의도까지
지운다. 그래서 아래 표에 적은 "틀린 것 → 맞는 것" 짝만, 있던 자리에서 바꾼다.
맞는 쪽이 이미 들어 있으면 틀린 쪽만 뺀다(중복 방지).

한 번 고친 뒤 또 돌려도 안전하다 — 바꿀 것이 없으면 아무것도 쓰지 않는다.
"""

from __future__ import annotations

import sys

from google.cloud import firestore

# 틀린 slug → 맞는 slug. 2026-09-15 원장님/매니저 확인:
#   p3-13(홍조·기미) 이 아니라 p3-14(립스틱)
#   p5-09(저고리 색) 이 아니라 p5-11(안경테)
FIXES = {
    "p3-13": "p3-14",
    "p5-09": "p5-11",
}


def apply_fixes(free: list[str]) -> list[str]:
    out: list[str] = []
    for slug in free:
        target = FIXES.get(slug, slug)
        # 맞는 쪽이 앞에서 이미 들어왔거나 원래 목록에 또 있으면 중복으로 넣지 않는다
        if target in out:
            continue
        out.append(target)
    return out


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

    data = snap.to_dict() or {}
    before = [str(x) for x in (data.get("freeQna") or [])]
    after = apply_fixes(before)

    print("현재 freeQna:", before)
    if before == after:
        print("바꿀 것이 없습니다 — 이미 올바른 무료 문항입니다.")
        return

    print("바뀔 freeQna:", after)
    for wrong, right in FIXES.items():
        if wrong in before:
            print(f"  ~ {wrong} → {right}")

    if dry:
        print("\n--dry-run 이므로 저장하지 않았습니다.")
        return

    ref.set({"freeQna": after}, merge=True)
    print("\n저장했습니다. 공개 페이지는 1시간 재검증 주기 안에 반영됩니다 "
          "(즉시 반영하려면 어드민 공개 범위에서 한 번 더 [저장]).")


if __name__ == "__main__":
    main()
