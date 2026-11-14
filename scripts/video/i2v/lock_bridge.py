"""잠긴 문항 쇼츠의 끝 — 잠금 화면 한 장 + 목소리 (2026-11-14).

무료 문항용 free_bridge.py 와 다른 점: 답을 끝까지 들려주지 않으므로 「다음 질문」이 아니라 *이 문항의 남은 답* 을
이름 붙여 잠근다(specs/locked5.json 의 loop). 판매가 목적이라 정보 나열(「답 95개 · 55,000원 · 전화」) 대신
① 무엇이 남았는지 ② 왜 이 답이 다른지(상담실에서만 하던 답) ③ 사실상 공짜가 되는 조건(예약 시 전액 차감)
④ 어디서 찾는지(프로필 링크 → 목록 번호) 순서로 쓴다. 쇼츠 화면에선 설명란·댓글 링크가 안 눌리므로
프로필 링크와 목록 번호를 화면과 목소리 둘 다로 준다. 「95개」는 틀린 숫자였다 — 사이트는 98문항이다.
구매 방법(전화)은 그대로 둔다.

    TYPECAST_API_KEY=… I2V_SET=locked5.json python3 free_voice.py p2-04   # 먼저
    TYPECAST_API_KEY=… python3 lock_bridge.py p2-04
"""
import json
import os
import re
import sys
from pathlib import Path

SPECS = Path(__file__).parent / "specs"
PITCH = "답은 100문 100답에 있어요. 원장이 상담실에서만 하던 답 98개, 메이크업 예약하시면 이용권 값을 전부 빼 드려요."


def spoken(label: str) -> str:
    """P2·04 → 「파트 2의 4번」. 목록에 보이는 번호를 그대로 읽어 찾기 쉽게."""
    part, n = re.match(r"P(\d)·(\d+)", label).groups()
    return f"파트 {part}의 {int(n)}번"


def lock_lines(p: dict) -> list[str]:
    return [p["loop"], "원장이 상담실에서만 하던 답 98개", "3개월 이용권 55,000원",
            "메이크업 예약하면 전액 차감", f"프로필 링크 → {p['label']}", "신청 · 전화 02-323-3321"]


def main(slug: str) -> None:
    os.environ.setdefault("I2V_SET", "locked5.json")
    sys.path.insert(0, str(Path(__file__).parent))
    import free_voice as fv  # 키를 읽으므로 실제로 만들 때만 불러온다

    p = json.load(open(SPECS / "locked5.json"))[slug]
    voice_dir = fv.B / slug / "voice"
    meta = [m for m in json.load(open(voice_dir / "segments.json")) if m["seg"] not in ("zz-bridge", "zz-outro2")]
    bridge = p["loop_voice"] + " " + PITCH
    outro = f"채널 프로필 링크, 100문 100답 {spoken(p['label'])}이에요."
    for seg, text in (("zz-bridge", bridge), ("zz-outro2", outro)):
        meta.append({"seg": seg, "voice": "Jiseon", "text": text, "dur": round(fv.tts(text, fv.JI, voice_dir / f"{seg}.wav"), 3)})
    json.dump(meta, open(voice_dir / "segments.json", "w"), ensure_ascii=False, indent=2)

    sp = SPECS / f"{slug}.json"
    spec = json.load(open(sp))
    scenes = [sc for sc in spec["scenes"] if not sc.get("lock")]
    last_still = next((sc["still"] for sc in reversed(scenes) if sc.get("still")), "img-02.jpg")
    scenes.append({"segs": ["zz-bridge"], "still": last_still, "blur": True, "zoom": 0.03, "caption": False, "lock": lock_lines(p)})
    json.dump({**spec, "scenes": scenes, "outro_seg": "zz-outro2", "next": slug}, open(sp, "w"), ensure_ascii=False, indent=2)
    body = [m for m in meta if m["seg"] not in ("zz-outro", "zz-domain", "zz-outro2")]
    tot = sum(m["dur"] for m in body) + 0.35 * len(body)
    print(slug, "main", round(tot, 1), "≈ total", round(tot + 6.5, 1), flush=True)


if __name__ == "__main__":
    for s in sys.argv[1:]:
        main(s)
