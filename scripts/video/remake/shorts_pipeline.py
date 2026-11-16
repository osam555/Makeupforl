"""리메이크 ⑤ 연작 쇼츠 4편 (일회성, 스크래치패드). 사양: video/scripts/top5/shorts-5.json.

    python3 shorts5.py voice  5-1 …   # Yunjeong 토막 → shorts/<ep>/voice + segments.json (끝 두 줄은 _common)
    python3 shorts5.py flow   5-1 …   # Flow 사양 파일(person/object)
    python3 shorts5.py imgs   5-1 …   # Flow 그림 (aside repl)
    python3 shorts5.py clips  5-1 …   # Veo 클립 3개
    python3 shorts5.py render 5-1 …   # i2v_short.py 로 조립
"""
import json, os, shutil, subprocess, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).parent
R = Path("/Users/osam/dev/makeupforl/.claude/worktrees/top6-10-remake-cf9a7d")
W = Path("/Users/osam/dev/makeupforl/.claude/worktrees/wed100-i2v-plan-438f77/video/work/i2v")  # 읽기만
SET = os.environ.get("TOP5_SET", "shorts-12-20.json")
SPEC = {k: v for k, v in json.load(open(R / "video/scripts/top5" / SET)).items()}
NARR_FILE = SPEC.get("_narration", "narration-5.json")
SPEC = {k: v for k, v in SPEC.items() if not k.startswith("_")}
VOICE = json.load(open(R / "video/scripts/top5/voice.json"))
NARR = R / "video/work/top12-20/narration"
OUT = R / "video/work/top12-20/shorts"
PROJ = HERE / os.environ.get("TOP_PROJ", "specs/top12-20.project.json")


def cap_of(p, i):
    c = p.get("cap") or {}
    return c[i] if isinstance(c, list) else c.get(str(i))
FONT = "/Users/osam/dev/speed-listening/store/video/book-promo-3part/work-myeongsim25/fonts"
COMMON = {"zz-outro": "100문 100답에서 확인하세요.", "zz-domain": "링크는 채널 프로필에 있어요."}
CL = ("Static camera, no zoom, no cut. Keep exactly the same scene, person, hanbok and Korean ink-and-wash illustration style "
      "(fine ink lines, soft watercolor washes, hanji paper texture stay visible the whole time; never becomes photorealistic or 3D) "
      "as the start frame. {m} Her face is never visible. Only small, natural movement. No new people, no new objects, no text, no camera shake.")
LOOK = (" The woman: Korean mother of the bride in her late 50s, short pale pink silk jeogori with long goreum ribbon, deep magenta "
        "full chima, dark brown hair in a neat low chignon; seen only from behind, face never visible.")


def dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                                capture_output=True, text=True, check=True).stdout)


def tts(text, dst):
    body = {"text": text, "model": VOICE["model"], "voice_id": VOICE["voice_id"], "language": VOICE["language"],
            "prompt": VOICE["prompt"], "output": {"audio_format": "wav"}}
    req = urllib.request.Request(VOICE["api"], data=json.dumps(body).encode(),
                                 headers={"X-API-KEY": os.environ["TYPECAST_API_KEY"], "Content-Type": "application/json"})
    raw = dst.with_suffix(".raw.wav"); raw.write_bytes(urllib.request.urlopen(req, timeout=120).read())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", dst], check=True)
    raw.unlink()


def body_scenes(ep):
    return [s for s in SPEC[ep]["scenes"] if s["kind"] != "lock"]


def voice(ep):
    p = SPEC[ep]; vd = OUT / ep / "voice"; vd.mkdir(parents=True, exist_ok=True)
    common = OUT / "_common"; common.mkdir(parents=True, exist_ok=True)
    lines = json.load(open(R / "video/scripts/top5" / NARR_FILE))["episodes"][ep]
    meta = []
    for i, f in enumerate(p["voice"]["files"]):
        dst = vd / f"s{i:02d}.wav"
        shutil.copy(NARR / p["voice"]["chunks"] / f"{f}.wav", dst)
        meta.append({"seg": f"s{i:02d}", "voice": "Yunjeong", "src": f, "text": cap_of(p, i) or lines[i], "dur": round(dur(dst), 3)})
    for seg, text in COMMON.items():
        c = common / f"{seg}.wav"
        if not c.exists():
            tts(text, c)
        shutil.copy(c, vd / f"{seg}.wav")
        meta.append({"seg": seg, "voice": "Yunjeong", "text": text, "dur": round(dur(c), 3)})
    json.dump(meta, open(vd / "segments.json", "w"), ensure_ascii=False, indent=2)
    print(ep, "voice", round(sum(m["dur"] + 0.35 for m in meta if m["seg"].startswith("s")), 1), "s")


def flow(ep):
    p = SPEC[ep]; D = OUT / ep / "damchae"; D.mkdir(parents=True, exist_ok=True)
    base = json.load(open(W / "p4-18/damchae/flow-spec.json")); still = json.load(open(W / "p4-19/damchae/flow-spec-still.json"))
    proj = json.load(open(PROJ))["flow_project"]
    lines = []
    for sc in body_scenes(ep):
        ln = {"img": sc["img"] + (LOOK if sc["p"] == "person" else "")}
        if sc["kind"] == "clip":
            ln["clip"] = CL.format(m=sc["m"])
        lines.append(ln)
    for name, banned in (("person", base["banned"]), ("object", still["banned"])):
        sp = dict(base); sp.update(id=f"top12-{ep}", sources=[str(D)], start_prefix=p["prefix"], banned=banned,
                                   lines=lines, flow_project=proj)
        json.dump(sp, open(D / f"flow-spec-{name}.json", "w"), ensure_ascii=False, indent=2)
    print(ep, "flow spec", len(lines), "lines")


def imgs(ep):
    D = OUT / ep / "damchae"
    for i, sc in enumerate(body_scenes(ep), 1):
        if (D / f"img-{i:02d}.jpg").exists():
            continue
        cmd = ["python3", "flow.py", "img", str(D / f"flow-spec-{sc['p']}.json"), str(i)]
        if sc["p"] == "person":
            # 프로젝트에 타일이 쌓이면 재료 목록에서 기준 그림이 밀려 「option not found」 — 매번 새 이름으로 다시 올린다
            ref = f"ref-{ep}-{i}.jpg"
            subprocess.run(["python3", "flow.py", "upload", str(D / f"flow-spec-person.json"),
                            str(W / "p4-18/damchae/img-01.jpg"), ref], cwd=HERE, capture_output=True, text=True)
            cmd += ["--ref", ref]
        for _ in range(2):
            r = subprocess.run(cmd, cwd=HERE, capture_output=True, text=True)
            if (D / f"img-{i:02d}.jpg").exists():
                break
        print(ep, i, "ok" if (D / f"img-{i:02d}.jpg").exists() else "FAIL " + r.stdout[-300:], flush=True)


def clips(ep):
    D = OUT / ep / "damchae"
    for i, sc in enumerate(body_scenes(ep), 1):
        if sc["kind"] != "clip" or (D / f"clip-{i:02d}.mp4").exists():
            continue
        r = subprocess.run(["python3", "flow.py", "clip", str(D / f"flow-spec-{sc['p']}.json"), str(i)], cwd=HERE, capture_output=True, text=True)
        print(ep, i, "ok" if (D / f"clip-{i:02d}.mp4").exists() else "FAIL " + r.stdout[-400:], flush=True)


def render(ep):
    p = SPEC[ep]; D = OUT / ep / "damchae"; segs = [f"s{i:02d}" for i in range(len(p["voice"]["files"]))]
    scenes, last_still = [], None
    for i, sc in enumerate(body_scenes(ep), 1):
        s = {"segs": [segs[i - 1]]}
        if sc["kind"] == "clip":
            s["clip"] = f"clip-{i:02d}.mp4"
        else:
            s.update(still=f"img-{i:02d}.jpg", zoom=0.07); last_still = s["still"]
        if i == 1:
            s.update(hook=p["hook"], caption=False)
        scenes.append(s)
    scenes.append({"segs": [segs[-1]], "still": last_still, "blur": True, "zoom": 0.03, "caption": False,
                   "lock": [p["question"], "정답은 100문 100답에서", f"프로필 링크 → {p['label']}",
                            "3개월 이용권 55,000원", "신청 · 전화 02-323-3321"]})
    out = R / f"video/out/shorts/top12-20/{ep}_v1.mp4"
    n = 1
    while out.exists():
        n += 1; out = out.with_name(f"{ep}_v{n}.mp4")
    sp = {"slug": p["target"], "font_dir": FONT, "dir": str(D), "voice_dir": str(OUT / ep / "voice"), "out": str(out),
          "outro_seg": "zz-outro", "domain_seg": "zz-domain", "scenes": scenes}
    spf = OUT / ep / "short.json"; json.dump(sp, open(spf, "w"), ensure_ascii=False, indent=2)
    subprocess.run(["python3", "i2v_short.py", str(spf)], cwd=HERE, check=True)


if __name__ == "__main__":
    fn = globals()[sys.argv[1]]
    for e in sys.argv[2:]:
        fn(e)
