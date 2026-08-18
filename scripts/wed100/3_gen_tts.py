#!/usr/bin/env python3
"""
팟캐스트 음성 + 자막 타임코드 생성기

- 진행자(질문) : Typecast ssfm-v30 "Jinhee" (여, 아나운서 톤)  ← TYPECAST_API_KEY 필요
- 원장님(답변) : edge-tts ko-KR-SunHiNeural (여, 1.25배속)

TYPECAST_API_KEY 가 없으면 진행자도 edge-tts SunHi 로 자동 폴백합니다.

문장(자막 큐) 단위로 따로 합성한 뒤 길이를 재서 이어 붙이므로
자막 타임코드가 오차 없이 문장 경계와 일치합니다.

출력
  public/wed100/audio/{slug}.mp3        팟캐스트 음성
  public/wed100/audio/{slug}.ko.vtt     한국어 자막
  public/wed100/audio/{slug}.en.vtt     영어 자막
  src/data/wed100.json                  각 cue 에 start/end(초) 기록, item 에 duration

사용법
  python3 scripts/wed100/3_gen_tts.py            # 전체 105문
  python3 scripts/wed100/3_gen_tts.py p1-01 p1-02  # 특정 항목만
  python3 scripts/wed100/3_gen_tts.py --part 1     # 특정 파트만
  python3 scripts/wed100/3_gen_tts.py --force      # 이미 만들어진 것도 다시
"""
import asyncio
import json
import os
import subprocess
import sys
import tempfile
import urllib.request

import edge_tts

# 사내 프록시/커스텀 CA 환경에서도 동작하도록 시스템 신뢰 저장소를 사용
# (edge-tts 기본값은 certifi 번들만 신뢰해 MITM 프록시 뒤에서 실패함)
try:
    import ssl as _ssl
    import edge_tts.communicate as _ec
    _ec._SSL_CTX = _ssl.create_default_context()
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "src", "data", "wed100.json")
OUTDIR = os.path.join(ROOT, "public", "wed100", "audio")

# 원장님(답변) — edge-tts. 한국어 여성 뉴럴 보이스는 SunHi 한 가지뿐이다.
VOICE_EXPERT = "ko-KR-SunHiNeural"
RATE_EXPERT = "+25%"                 # 원장님 답변: 1.25배속 기본
PITCH_EXPERT = "-6Hz"

# 진행자(질문) — Typecast. edge-tts 에는 SunHi 말고 다른 한국어 여성 음성이 없어서
# MC 만 Typecast 로 뽑는다. 키가 없으면 아래 폴백 설정으로 edge-tts 를 쓴다.
TYPECAST_KEY = os.environ.get("TYPECAST_API_KEY", "")
TYPECAST_VOICE = os.environ.get("TYPECAST_VOICE_ID", "tc_6731b2b2478a48710ecc9158")  # Jinhee
TYPECAST_MODEL = os.environ.get("TYPECAST_MODEL", "ssfm-v30")
TYPECAST_EMOTION = os.environ.get("TYPECAST_EMOTION", "normal")
TYPECAST_URL = "https://api.typecast.ai/v1/text-to-speech"

VOICE_HOST_FALLBACK = "ko-KR-SunHiNeural"   # 키 없을 때만 사용
RATE_HOST = "+6%"
PITCH_HOST = "+18Hz"

GAP = 0.28                           # 문장 사이 간격(초)
BITRATE = "48k"                      # 최종 인코딩(모노)
SAMPLE_RATE = 24000                  # edge-tts 출력과 동일 — 이어붙이려면 맞춰야 한다


def ffprobe_dur(path: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


async def synth(text: str, voice: str, rate: str, pitch: str, path: str):
    c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await c.save(path)


def synth_typecast(text: str, path: str):
    """Typecast 로 진행자(MC) 음성 합성 후 edge-tts 와 같은 규격으로 맞춘다.

    Typecast 는 44.1kHz/320kbps 로 주기 때문에 그대로 이어붙이면 재생 길이가
    틀어진다. 24kHz/48kbps 모노로 다시 인코딩해 답변 구간과 규격을 통일한다.
    """
    req = urllib.request.Request(
        TYPECAST_URL,
        data=json.dumps({
            "text": text,
            "model": TYPECAST_MODEL,
            "voice_id": TYPECAST_VOICE,
            "language": "kor",
            "prompt": {"emotion_type": "preset", "emotion_preset": TYPECAST_EMOTION},
            "output": {"audio_format": "wav"},
        }).encode(),
        headers={"X-API-KEY": TYPECAST_KEY, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as f:
        raw = f.read()

    src = path + ".src.wav"
    open(src, "wb").write(raw)
    subprocess.run(
        ["ffmpeg", "-y", "-i", src, "-ar", str(SAMPLE_RATE), "-ac", "1",
         "-b:a", BITRATE, path],
        capture_output=True, check=True)
    os.remove(src)


async def synth_host(text: str, path: str):
    if TYPECAST_KEY:
        synth_typecast(text, path)
    else:
        await synth(text, VOICE_HOST_FALLBACK, RATE_HOST, PITCH_HOST, path)


def ts(sec: float) -> str:
    h = int(sec // 3600)
    m = int(sec % 3600 // 60)
    s = sec % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def write_vtt(path: str, cues, key: str):
    lines = ["WEBVTT", ""]
    for i, c in enumerate(cues, 1):
        txt = (c.get(key) or "").strip()
        if not txt:
            continue
        lines += [str(i), f"{ts(c['start'])} --> {ts(c['end'])}", txt, ""]
    open(path, "w", encoding="utf-8").write("\n".join(lines))


async def build_item(item: dict, tmp: str) -> dict:
    """질문 + 답변 큐를 합성해 하나의 mp3로 만들고 타임코드를 반환."""
    segs = []  # (path, dur, kind, cue_index)

    qpath = os.path.join(tmp, "q.mp3")
    await synth_host(item["question"], qpath)
    segs.append((qpath, ffprobe_dur(qpath), "q", -1))

    for i, cue in enumerate(item["cues"]):
        p = os.path.join(tmp, f"c{i:03d}.mp3")
        await synth(cue["ko"], VOICE_EXPERT, RATE_EXPERT, PITCH_EXPERT, p)
        segs.append((p, ffprobe_dur(p), "a", i))

    # 무음 패딩
    sil = os.path.join(tmp, "sil.mp3")
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i",
                    f"anullsrc=r={SAMPLE_RATE}:cl=mono", "-t", str(GAP),
                    "-b:a", BITRATE, sil], capture_output=True, check=True)
    sil_dur = ffprobe_dur(sil)

    # concat 목록 + 타임코드 누적
    listing, t = [], 0.0
    item["questionAudio"] = {"start": 0.0, "end": segs[0][1]}
    for idx, (p, d, kind, ci) in enumerate(segs):
        listing.append(p)
        if kind == "a":
            item["cues"][ci]["start"] = round(t, 3)
            item["cues"][ci]["end"] = round(t + d, 3)
        t += d
        if idx < len(segs) - 1:
            listing.append(sil)
            t += sil_dur
    item["questionAudio"]["end"] = round(segs[0][1], 3)

    txt = os.path.join(tmp, "list.txt")
    open(txt, "w").write("\n".join(f"file '{p}'" for p in listing))
    out = os.path.join(OUTDIR, f"{item['slug']}.mp3")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", txt,
                    "-ac", "1", "-b:a", BITRATE, out], capture_output=True, check=True)

    item["duration"] = round(ffprobe_dur(out), 3)
    item["audio"] = f"/wed100/audio/{item['slug']}.mp3"
    write_vtt(os.path.join(OUTDIR, f"{item['slug']}.ko.vtt"), item["cues"], "ko")
    write_vtt(os.path.join(OUTDIR, f"{item['slug']}.en.vtt"), item["cues"], "en")
    return item


async def main():
    args = [a for a in sys.argv[1:]]
    force = "--force" in args
    args = [a for a in args if a != "--force"]
    part = None
    if "--part" in args:
        part = int(args[args.index("--part") + 1])
        args = []

    data = json.load(open(DATA, encoding="utf-8"))
    os.makedirs(OUTDIR, exist_ok=True)

    targets = data["items"]
    if args:
        targets = [x for x in targets if x["slug"] in args]
    elif part:
        targets = [x for x in targets if x["part"] == part]
    if not force:
        targets = [x for x in targets
                   if not os.path.exists(os.path.join(OUTDIR, f"{x['slug']}.mp3"))]

    print("MC 음성: " + (f"Typecast {TYPECAST_VOICE} ({TYPECAST_MODEL}/{TYPECAST_EMOTION})"
                       if TYPECAST_KEY else f"edge-tts {VOICE_HOST_FALLBACK} (폴백)"))
    print(f"대상 {len(targets)}개")
    for k, it in enumerate(targets, 1):
        with tempfile.TemporaryDirectory() as tmp:
            try:
                await build_item(it, tmp)
                print(f"  [{k}/{len(targets)}] {it['slug']} "
                      f"{it['duration']:.1f}s / {len(it['cues'])}큐")
            except Exception as e:
                print(f"  [{k}/{len(targets)}] {it['slug']} 실패: {e}")
        json.dump(data, open(DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    done = len([x for x in data["items"] if x.get("audio")])
    print(f"[OK] 음성 보유 {done}/{len(data['items'])}문")


if __name__ == "__main__":
    asyncio.run(main())
