# 쓰는 토막을 whisper medium(ko)으로 받아써 대본과 견준다. asr.py <root> [ep:name …]
import json, re, sys, difflib
from pathlib import Path
import whisper
ROOT = Path(sys.argv[1])
L = json.loads((ROOT / "video/scripts/top5/narration-12-20.json").read_text())["episodes"]
S = json.loads((ROOT / "video/scripts/top5/shorts-12-20.json").read_text())
N = ROOT / "video/work/top12-20/narration"
m = whisper.load_model("medium")
norm = lambda t: re.sub(r"[^0-9A-Za-z가-힣]", "", t)
jobs = [tuple(a.split(":")) for a in sys.argv[2:]] or [(e, f) for e in L for f in S[e]["voice"]["files"]]
for ep, f in jobs:
    i = int(f[:2]); want = L[ep][i]
    got = m.transcribe(str(N / f"{ep}_chunks" / f"{f}.wav"), language="ko", fp16=False, temperature=0)["text"].strip()
    r = difflib.SequenceMatcher(None, norm(want), norm(got)).ratio()
    print(f"{'OK ' if r > 0.93 else '?? '}{ep}:{f} {r:.2f}\n   대본 {want}\n   받아 {got}", flush=True)
