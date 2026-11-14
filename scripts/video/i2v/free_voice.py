import json, os, re, subprocess, sys, urllib.request
from pathlib import Path
S = Path(__file__).parent / "specs"
SET = os.environ.get("I2V_SET", "free5.json")  # 문항 묶음 — free5.json(무료 5편) · locked5.json(잠긴 5편)
R = Path(__file__).resolve().parents[3]  # 저장소 뿌리 — worktree 경로를 박아 두면 worktree 를 지우는 순간 깨진다
B = R / "video/work/i2v"
JI, MC = "tc_6a4f2130d153a5cac8e19996", "tc_6731b2b2478a48710ecc9158"
KEY = os.environ["TYPECAST_API_KEY"]
items = {x["slug"]: x for x in json.load(open(R / "src/data/wed100.json"))["items"]}
allp = {k: v for k, v in json.load(open(S / SET)).items() if not k.startswith("_")}
OUT = "더 궁금하신 점은, 혼주메이크업 100문 100답에서 확인하세요."
DOM = "링크는 채널 프로필에 있어요."

def chunks(t, mx=48):
    parts = [x for x in re.split(r"(?<=[,，])\s*", t.strip()) if x.strip()]
    out = []
    for x in parts:
        if out and len(out[-1]) + len(x) <= mx:
            out[-1] = out[-1] + " " + x
        else:
            out.append(x)
    return out

def tts(text, vid, path):
    req = urllib.request.Request("https://api.typecast.ai/v1/text-to-speech", data=json.dumps({"text": text, "model": "ssfm-v30", "voice_id": vid, "language": "kor", "prompt": {"emotion_type": "preset", "emotion_preset": "normal"}, "output": {"audio_format": "wav"}}).encode(), headers={"X-API-KEY": KEY, "Content-Type": "application/json"})
    src = str(path) + ".src.wav"; open(src, "wb").write(urllib.request.urlopen(req, timeout=120).read())
    af = "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", af, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", str(path)], check=True); os.remove(src)
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture_output=True, text=True).stdout)

def main():
    for slug in (sys.argv[1:] or list(allp)):
        p, it = allp[slug], items[slug]
        V = B / slug / "voice"; V.mkdir(parents=True, exist_ok=True)
        q = re.sub(r"[‘’'\"]", "", it["question"])
        cue_chunks = {c["i"]: chunks(c["ko"]) for c in it["cues"]}
        # 1a/1b: 큰 자막 하나를 반으로
        def segs_for(key):
            if key == "q":
                return [("q", MC, q)]
            if isinstance(key, str) and key[-1] in "ab":
                ch = cue_chunks[int(key[:-1])]; h = (len(ch) + 1) // 2
                ch = ch[:h] if key[-1] == "a" else ch[h:]
                return [(f"c{key}-{k}", JI, t) for k, t in enumerate(ch)]
            return [(f"c{key}-{k}", JI, t) for k, t in enumerate(cue_chunks[key])]
        meta, scenes = [], []
        for sc in p["scenes"]:
            names = []
            for key in sc["cues"]:
                for name, vid, text in segs_for(key):
                    d = tts(text, vid, V / f"{name}.wav")
                    meta.append({"seg": name, "voice": "Jinhee" if vid == MC else "Jiseon", "text": text, "dur": round(d, 3)}); names.append(name)
            scenes.append(names)
        for name, text in [("zz-outro", OUT), ("zz-domain", DOM)]:
            meta.append({"seg": name, "voice": "Jiseon", "text": text, "dur": round(tts(text, JI, V / f"{name}.wav"), 3)})
        json.dump(meta, open(V / "segments.json", "w"), ensure_ascii=False, indent=2)
        spec = {"slug": slug, "font_dir": "/Users/osam/dev/speed-listening/store/video/book-promo-3part/work-myeongsim25/fonts",
                "dir": f"video/work/i2v/{slug}/damchae", "voice_dir": f"video/work/i2v/{slug}/voice", "out": f"video/out/shorts/i2v/{slug}_v1.mp4",
                "outro_seg": "zz-outro", "domain_seg": "zz-domain", "scenes": []}
        for i, (sc, names) in enumerate(zip(p["scenes"], scenes), 1):
            e = {"segs": names}
            e.update({"clip": f"clip-{i:02d}.mp4"} if sc["kind"] == "clip" else {"still": f"img-{i:02d}.jpg", "zoom": 0.07})
            if i == 1:
                e.update(hook=p["hook"], caption=False)
            spec["scenes"].append(e)
        json.dump(spec, open(S / f"{slug}.json", "w"), ensure_ascii=False, indent=2)
        tot = sum(m["dur"] for m in meta[:-2]) + 0.35 * (len(meta) - 2)
        print(slug, "segments", len(meta), "main", round(tot, 1), "s", flush=True)


if __name__ == "__main__":
    main()
