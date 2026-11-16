# 의심 토막 후보 3개씩 만들고 whisper medium 으로 받아써 견준다. recand20.py <root> ep:i …
import json, os, re, subprocess, sys, urllib.request, difflib
from pathlib import Path
import whisper
ROOT = Path(sys.argv[1])
VOICE = json.loads((ROOT / "video/scripts/top5/voice.json").read_text())
LINES = json.loads((ROOT / "video/scripts/top5/narration-12-20.json").read_text())["episodes"]
N = ROOT / "video/work/top12-20/narration"
KEY = os.environ["TYPECAST_API_KEY"]
m = whisper.load_model("medium")
norm = lambda t: re.sub(r"[^0-9A-Za-z가-힣]", "", t)
for job in sys.argv[2:]:
    ep, i = job.split(":"); i = int(i)
    for k in range(3):
        dst = N / f"{ep}_chunks" / f"{i:02d}_c{k}.wav"
        if not dst.exists():
            body = {"text": LINES[ep][i], "model": VOICE["model"], "voice_id": VOICE["voice_id"], "language": VOICE["language"],
                    "prompt": VOICE["prompt"], "output": {"audio_format": "wav"}}
            req = urllib.request.Request(VOICE["api"], data=json.dumps(body).encode(), headers={"X-API-KEY": KEY, "Content-Type": "application/json"})
            raw = dst.with_suffix(".raw"); raw.write_bytes(urllib.request.urlopen(req, timeout=120).read())
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", dst], check=True)
            raw.unlink()
        got = m.transcribe(str(dst), language="ko", fp16=False, temperature=0)["text"].strip()
        r = difflib.SequenceMatcher(None, norm(LINES[ep][i]), norm(got)).ratio()
        print(f"{ep}:{i:02d}_c{k} {r:.2f} {got}", flush=True)
