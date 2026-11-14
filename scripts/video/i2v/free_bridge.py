import json, subprocess, sys
from pathlib import Path
S = Path(__file__).parent / "specs"
sys.path.insert(0, str(Path(__file__).parent)); import free_voice as fv  # noqa: E402  (tts, B, JI)
NEXT = {"p1-06": ("p2-04", "상담 때 무엇을 준비할까?"), "p2-05": ("p2-06", "사진 가져가면 도움 될까?"),
        "p3-15": ("p6-07", "눈물 날 때 손수건 쓰는 법"), "p4-07": ("p4-08", "긴 얼굴형엔 어떤 머리?"),
        "p5-13": ("p5-11", "한복에 어울리는 안경테는?")}
TEMPO_OLD = {"p1-06": 1.07, "p3-15": 1.07}
TEMPO = {"p1-06": 1.07, "p3-15": 1.1}
BRIDGE = "다음 질문은 잠겨 있어요. 이런 답이 95개, 3개월 이용권 5만 5천 원이에요."  # 「예약 시 차감」은 뺐다(2026-11-15)
OUTRO = "100문 100답에서 확인하세요."
for slug, (nxt, short) in [(k, v) for k, v in NEXT.items() if not sys.argv[1:] or k in sys.argv[1:]]:
    V = fv.B / slug / "voice"
    meta = json.load(open(V / "segments.json"))
    meta = [dict(m, seg=m["seg"][:-2], dur=round(m["dur"] * TEMPO_OLD.get(slug, 1), 3)) if m["seg"].endswith("-t") else m for m in meta if m["seg"] not in ("zz-bridge", "zz-outro2")]
    t = TEMPO.get(slug)
    if t:  # 1.0~1.1배 안에서만 (전역 규칙). 원본은 두고 새 이름으로
        for m in meta:
            if m["seg"].startswith("zz-") or m["seg"].endswith("-t"):
                continue
            src, dst = V / f"{m['seg']}.wav", V / f"{m['seg']}-t.wav"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", f"atempo={t}", "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", dst], check=True)
            m["seg"] += "-t"; m["dur"] = round(m["dur"] / t, 3)
    meta.append({"seg": "zz-bridge", "voice": "Jiseon", "text": BRIDGE, "dur": round(fv.tts(BRIDGE, fv.JI, V / "zz-bridge.wav"), 3)})
    meta.append({"seg": "zz-outro2", "voice": "Jiseon", "text": OUTRO, "dur": round(fv.tts(OUTRO, fv.JI, V / "zz-outro2.wav"), 3)})
    json.dump(meta, open(V / "segments.json", "w"), ensure_ascii=False, indent=2)
    spec = json.load(open(S / f"{slug}.json"))
    if t:
        for sc in spec["scenes"]:
            sc["segs"] = [x if x.endswith("-t") else x + "-t" for x in sc["segs"]]
    spec["scenes"] = [sc for sc in spec["scenes"] if not sc.get("lock")]
    last_still = next(sc for sc in reversed(spec["scenes"]) if sc.get("still"))["still"]
    spec["scenes"].append({"segs": ["zz-bridge"], "still": last_still, "blur": True, "zoom": 0.03, "caption": False,
                           "lock": ["다음 질문은 잠겨 있어요", short, "답 95개 · 3개월 55,000원", "신청 · 전화 02-323-3321"]})
    spec["outro_seg"] = "zz-outro2"
    spec["next"] = nxt
    json.dump(spec, open(S / f"{slug}.json", "w"), ensure_ascii=False, indent=2)
    main = sum(m["dur"] for m in meta if m["seg"] not in ("zz-outro", "zz-domain", "zz-outro2")) + 0.35 * len([m for m in meta if m["seg"] not in ("zz-outro", "zz-domain", "zz-outro2")])
    print(slug, "→", nxt, "main", round(main, 1), "≈ total", round(main + 6.5, 1), flush=True)
