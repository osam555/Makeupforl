# 일회성: ⑤ 연작 4편 내레이션 (Typecast Yunjeong). 토막 = 한 줄, 쉼 0.35초, 48kHz 24-bit 모노, 덮어쓰기 없음.
import json, os, subprocess, sys, urllib.request
from pathlib import Path

ROOT = Path(sys.argv[1])
VOICE = json.loads((ROOT / "video/scripts/top5/voice.json").read_text())
LINES = json.loads((ROOT / "video/scripts/top5/narration-12-20.json").read_text())["episodes"]
OUT = ROOT / "video/work/top12-20/narration"
KEY = os.environ["TYPECAST_API_KEY"]


def ff(*a):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *map(str, a)], check=True)


def tts(text, dst):
    body = {"text": text, "model": VOICE["model"], "voice_id": VOICE["voice_id"], "language": VOICE["language"],
            "prompt": VOICE["prompt"], "output": {"audio_format": "wav"}}
    req = urllib.request.Request(VOICE["api"], data=json.dumps(body).encode(), headers={"X-API-KEY": KEY, "Content-Type": "application/json"})
    raw = dst.with_suffix(".src.wav")
    raw.write_bytes(urllib.request.urlopen(req, timeout=120).read())
    ff("-i", raw, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", dst)
    raw.unlink()


def free(stem):
    n = 1
    while (OUT / f"{stem}_v{n}.wav").exists():
        n += 1
    return OUT / f"{stem}_v{n}.wav"


for ep in sys.argv[2:] or LINES:
    cd = OUT / f"{ep}_chunks"
    cd.mkdir(parents=True, exist_ok=True)
    parts = []
    for i, line in enumerate(LINES[ep]):
        p = cd / f"{i:02d}.wav"
        if not p.exists():
            tts(line, p)
        parts.append(p)
    gap = cd / "gap.wav"
    ff("-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", VOICE["gap_sec"], "-c:a", "pcm_s24le", gap)
    lst = cd / "concat.txt"
    lst.write_text("".join(f"file '{x}'\n" for x in [y for p in parts for y in (p, gap)][:-1]))
    dst = free(f"{ep}_yunjeong")
    ff("-f", "concat", "-safe", "0", "-i", lst, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000", "-ac", "1", "-c:a", "pcm_s24le", dst)
    print(dst)
