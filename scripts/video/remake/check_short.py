# 완성본 검사: 길이·해상도·음량·무음·프레임 모음·받아쓰기 일치율. check20.py <ep …>
import json, re, subprocess, sys, difflib
from pathlib import Path
import whisper
R = Path("/Users/osam/dev/makeupforl/.claude/worktrees/top6-10-remake-cf9a7d")
SH = Path(sys.argv[0]).parent.parent / "sh20"; SH.mkdir(exist_ok=True)
L = json.loads((R / "video/scripts/top5/narration-12-20.json").read_text())["episodes"]
m = whisper.load_model("medium")
norm = lambda t: re.sub(r"[^0-9A-Za-z가-힣]", "", t)
for ep in sys.argv[1:]:
    f = R / f"video/out/shorts/top12-20/{ep}_v1.mp4"
    pr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout.split()
    dur = float(pr[-1])
    ln = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(f), "-af", "loudnorm=print_format=summary,silencedetect=n=-45dB:d=1.5", "-f", "null", "-"], capture_output=True, text=True).stderr
    lufs = re.search(r"Input Integrated:\s+(-?[\d.]+)", ln).group(1); tp = re.search(r"Input True Peak:\s+(-?[\d.]+)", ln).group(1)
    sil = re.findall(r"silence_duration: ([\d.]+)", ln)
    ts = [1.5, dur * 0.22, dur * 0.42, dur * 0.62, dur - 7.5, dur - 2.0]
    for k, t in enumerate(ts):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(f), "-frames:v", "1", "-vf", "scale=360:640", str(SH / f"f{ep}_{k}.jpg")])
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-pattern_type", "glob", "-i", str(SH / f"f{ep}_?.jpg"), "-vf", "tile=6x1:padding=6", "-frames:v", "1", str(SH / f"final_{ep}.jpg")])
    got = m.transcribe(str(f), language="ko", fp16=False, temperature=0)["text"]
    want = "".join(L[ep]) + "100문 100답에서 확인하세요. 링크는 채널 프로필에 있어요."
    r = difflib.SequenceMatcher(None, norm(want), norm(got)).ratio()
    print(f"{ep} {pr[0]} {dur:.1f}s {lufs} LUFS TP {tp} silence>1.5s {sil} asr {r:.2f}\n   {got.strip()}", flush=True)
