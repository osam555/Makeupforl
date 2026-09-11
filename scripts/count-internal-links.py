#!/usr/bin/env python3
"""내부 링크를 세어 src/data/internal-links.json 으로 떨군다.

준비도의 '내부 링크' 항목은 지금까지 실측이 아니었다. 허브면 무조건 4였다.
2026-09-11 에 실제로 세어 보니 /혼주한복 2곳, /혼주머리 2곳, /혼주메이크업 6곳으로
셋 다 틀렸고, 덕분에 "본문에서 3곳 이상 링크를 거세요" 라는 할 일이 한 번도 뜬
적이 없었다.

사람이 어드민에 세어 적게 할 수도 있었지만 그러지 않았다. 순위는 밖에서 재야 아는
값이라 사람이 적는 게 맞지만, 내부 링크는 우리 저장소 안에 답이 있다. 답이 안에
있는데 사람에게 물으면 링크를 하나 걸 때마다 어긋난다.

세는 규칙:

  - **href 에 들어간 것만** 센다. 주석에 적힌 주소, placeholder, 문서에 예로 적은
    주소는 링크가 아니다. 그것까지 세면 글을 쓸수록 점수가 오른다.
  - **메뉴(components/layout)는 세지 않는다.** upgrades() 가 적어 둔 그대로
    "메뉴에만 있는 것과 본문에서 걸리는 것은 무게가 다르다". 한 번 걸면 모든
    페이지에 실리는 링크를 본문 링크와 같이 셀 수 없다.

못 세는 것이 하나 있다. navigation.ts 는 메뉴의 허브 링크를 `HUBS.map()` 으로
**계산해서** 만든다 — 소스에 '/혼주한복' 이라는 글자가 아예 없다. 글자를 훑는
방식으로는 영원히 안 보인다. 메뉴는 어차피 점수에서 빼므로 결과는 같지만,
본문 링크도 그렇게 계산해서 만들면 똑같이 안 보인다는 뜻이다.

그래서 이 숫자는 **실제보다 적을 수는 있어도 많을 수는 없다.** 틀리는 방향이
"할 일이 더 있는 것처럼" 이라 안전한 쪽이다. 반대 방향으로 틀리는 자는
(무조건 4처럼) 다 해 놓은 것처럼 보이게 만들어서 할 일을 숨긴다.

어드민 화면은 sourcedAt 을 함께 보여 준다. 이 스크립트가 안 돌면 날짜가 낡아서
티가 난다 — 조용히 옛 숫자를 지금 값처럼 보는 일을 막는다.

    python3 scripts/count-internal-links.py
"""

from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
OUT = SRC / "data" / "internal-links.json"

# 손님이 보는 화면이 아닌 곳. 어드민에서 /혼주한복 을 적어 둔 것은 링크가 아니다
SKIP_DIRS = ("src/app/admin", "src/components/admin")
# 허브 정의와 검색어 목표 표에 적힌 owner 주소도 링크가 아니다
SKIP_FILES = ("src/lib/hubs.ts", "src/lib/seoKeywords.ts", "src/lib/seoKeywords.server.ts")

# href="/무엇" (JSX) 과 href: '/무엇' (객체) 둘 다. 뒤에 ?나 # 이 붙어도 앞만 본다
HREF = re.compile(r"""href\s*[=:]\s*\{?["'`](/[^"'`{}\s?#]*)""")


def main() -> None:
    counts: dict[str, int] = {}
    where: dict[str, list[str]] = {}

    for path in sorted(SRC.rglob("*")):
        if path.suffix not in (".ts", ".tsx") or not path.is_file():
            continue
        rel = path.relative_to(ROOT).as_posix()
        if any(rel.startswith(d) for d in SKIP_DIRS) or rel in SKIP_FILES:
            continue
        if "/components/layout/" in rel:      # 메뉴는 점수에서 뺀다
            continue

        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            for target in HREF.findall(line):
                target = target.rstrip("/") or "/"
                counts[target] = counts.get(target, 0) + 1
                where.setdefault(target, []).append(f"{rel}:{lineno}")

    data = {
        "countedAt": date.today().isoformat(),
        "links": dict(sorted(counts.items())),
        # 어디에서 걸렸는지도 남긴다 — 숫자만 있으면 왜 그 값인지 확인할 방법이 없다
        "where": {k: v for k, v in sorted(where.items())},
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"{OUT.relative_to(ROOT)} — 주소 {len(counts)}개 (메뉴 제외)")
    for target in ("/혼주한복", "/혼주머리", "/혼주메이크업"):
        print(f"  {target}: 본문 링크 {counts.get(target, 0)}곳")


if __name__ == "__main__":
    main()
