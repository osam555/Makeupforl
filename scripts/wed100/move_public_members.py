#!/usr/bin/env python3
"""공개 문서 site_config/wed100 의 옛 구매자 명단(members)을 wed100_members 로 옮기고 지운다.

왜: site_config 는 손님 화면이 읽어야 해서 공개 읽기다. 2026-10-31 회원 등록을
관리자 전용 wed100_members 로 옮겼지만, 그 전에 넣은 두 명의 이메일이 공개 문서에
남아 로그인 없이 읽혔다(2026-11-07 확인). getWed100Access() 는 두 곳을 합쳐 보므로
옮기는 동안 구매자가 막히지 않는다 — 새 명단에 먼저 쓰고 나서 옛 칸을 지운다.

이미 새 명단에 있는 이메일은 덮어쓰지 않는다(이름·전화·기한이 새 쪽에 있다).
옛 명단에는 이름·전화가 없으므로 이름은 '(옛 명단)' 으로 둔다 — /admin/members 에서 고쳐 넣는다.

사용법 (기본은 보기만 한다)
  GOOGLE_APPLICATION_CREDENTIALS=<키> python3 scripts/wed100/move_public_members.py
  GOOGLE_APPLICATION_CREDENTIALS=<키> python3 scripts/wed100/move_public_members.py --apply
"""
import re
import sys
from datetime import datetime, timezone

PROJECT = "makeupforl"
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def mask(email: str) -> str:
    # 터미널 기록에 개인정보가 남지 않게 앞 두 글자만 보인다
    name, _, host = email.partition("@")
    return f"{name[:2]}***@{host}"


def normalize(raw) -> list[dict]:
    # wed100Access.ts 의 normalizeMembers 와 같은 규칙 — 문자열은 기한 없음으로 받는다
    out = []
    for m in raw or []:
        if isinstance(m, str):
            e = m.strip().lower()
            if e:
                out.append({"email": e, "until": None})
        elif isinstance(m, dict):
            e = str(m.get("email") or "").strip().lower()
            if not e:
                continue
            u = m.get("until")
            out.append({"email": e, "until": u if isinstance(u, str) and DATE.match(u) else None})
    return out


def main():
    apply = "--apply" in sys.argv
    from google.cloud import firestore

    db = firestore.Client(project=PROJECT)
    cfg = db.collection("site_config").document("wed100")
    snap = cfg.get()
    legacy = normalize((snap.to_dict() or {}).get("members"))
    if not legacy:
        print("공개 문서에 남은 구매자 이메일이 없습니다.")
        return

    now = datetime.now(timezone.utc).isoformat()
    col = db.collection("wed100_members")
    for m in legacy:
        ref = col.document(m["email"])
        exists = ref.get().exists
        print(f"  {mask(m['email']):<28} 기한 {m['until'] or '없음':<10} "
              f"{'새 명단에 이미 있음 — 건너뜀' if exists else '새 명단에 넣음'}")
        if apply and not exists:
            ref.set({
                "email": m["email"],
                "until": m["until"],
                "name": "(옛 명단)",
                "phone": "",
                "createdAt": now,
                "updatedAt": now,
            })

    if apply:
        cfg.update({"members": firestore.DELETE_FIELD})
        print(f"옮김 {len(legacy)}건, site_config/wed100.members 지움.")
        print("확인: /admin/members 에 보이는지, 해당 계정으로 잠긴 문항이 열리는지.")
    else:
        print("보기만 했습니다. 실제로 옮기려면 --apply")


if __name__ == "__main__":
    main()
