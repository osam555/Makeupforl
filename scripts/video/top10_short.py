"""잠금 문항 쇼츠 한 편 — HyperFrames(훅·잠금 화면) + Flow(원장님 한마디) + Remotion(본편 틀) + ffmpeg(끝·음량).

기획: docs/video/쇼츠-100문100답-인기10편-기획.md, 대본: video/scripts/03-인기10편.json.

앞선 무료 문항 쇼츠(wed100_short.py)와 다른 점은 하나다 — **답을 다 들려주지 않는다.**
이번 10편은 유료 95개 안의 문항이라 앞쪽 자막 몇 개(reveal)만 들려주고 결론 직전에 잠금 화면으로 넘긴다.
그래서 한 편이 「MC 질문(훅) → 원장님 공감 한마디(Flow) → 답 앞부분 → 잠금 화면 → 끝 카드」가 된다.

나누어 맡긴 까닭:
  - 훅·잠금 화면은 문항마다 글이 다르고 움직임이 있어야 한다 → HTML 한 장으로 그리는 HyperFrames
  - 본편은 10편이 같은 틀이고 장면 목록만 다르다 → props 로 찍어 내는 Remotion
  - 끝 카드·소리 섞기·-14 LUFS 는 앞선 여섯 편과 똑같아야 한다 → wed100_short 의 ending()·loudnorm 을 그대로 부른다
소리는 Remotion 에 넣지 않는다. 원장님 목소리를 한 음색(voice-first.wav)으로 바꾸는 단계가 섞은 소리에 돌아야 해서
numpy 로 섞고 마지막 ffmpeg 에서 영상과 합친다.

목소리(2026-11-06 「원장 음성이 4가지 정도 나온다 — 첫번째 음성을 유지하게」):
  - MC 질문(Typecast)은 다른 사람 목소리라 그대로 둔다
  - 원장님 몫(답 앞부분·잠금 한 줄·마무리 두 줄)은 edge-tts 라 Flow 원장님과 다르게 들린다 → --voice first 면 모두 voice-first 음색으로
  - Flow 컷은 잡음을 걷어(demucs) 같은 음색으로 — 박자는 Flow 그대로라 입이 맞는다(flow_voice_convert.py)

잠금 답은 시드 JSON 에 비어 있어 Firestore 에서 읽는다(wed100_questions 는 공개 읽기).

실행:
  P=video/work/.venv/bin/python
  $P scripts/video/top10_short.py p4-01 [--flow video/raw/flow/top10/p4-01.mp4] [--crop 0.2-0.8] [--pos "60% 40%"] [--voice first|tts]
  --flow 가 없으면 원장님 한마디를 대표 사진 + edge-tts 로 임시로 채운다(크레딧 쓰기 전에 흐름을 보려고).
"""
import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
import wed100_short as ws  # noqa: E402

ROOT = ws.ROOT
SR, FPS = ws.SR, ws.FPS
HF = ROOT / "video/hyperframes"
RM = ROOT / "video/remotion"
DRAFT = ROOT / "video/scripts/03-인기10편.json"
VOICE_REF = ROOT / "video/work/intro/voice-first.wav"
VOICE_PY = Path.home() / ".venvs/voice/bin/python"
FIRESTORE = "https://firestore.googleapis.com/v1/projects/makeupforl/databases/(default)/documents/wed100_questions/"
LOCK_TAIL = "정답은 100문 100답에 있어요."


def plain(v):
    """Firestore REST 의 타입 붙은 값({stringValue: …})을 보통 값으로"""
    if "mapValue" in v:
        return {k: plain(x) for k, x in v["mapValue"].get("fields", {}).items()}
    if "arrayValue" in v:
        return [plain(x) for x in v["arrayValue"].get("values", [])]
    for k in ("stringValue", "booleanValue", "timestampValue"):
        if k in v:
            return v[k]
    if "integerValue" in v:
        return int(v["integerValue"])
    if "doubleValue" in v:
        return float(v["doubleValue"])
    return None


def load_item(slug, work):
    cache = work / "item.json"
    if not cache.exists():
        with urllib.request.urlopen(FIRESTORE + slug) as r:
            doc = json.load(r)
        cache.write_text(json.dumps({k: plain(v) for k, v in doc["fields"].items()}, ensure_ascii=False, indent=1))
    return json.loads(cache.read_text())


def fetch(url, path):
    if not path.exists():
        urllib.request.urlretrieve(url, path)
    return path


def vc(wav_in, wav_out, plain_voice):
    """원장님 몫을 voice-first 음색으로. 길이는 그대로 돌아온다(flow_voice_convert 가 맞춘다)."""
    cmd = [str(VOICE_PY), str(ROOT / "scripts/video/flow_voice_convert.py"), str(wav_in), str(VOICE_REF), str(wav_out)]
    if plain_voice:
        cmd.append("--plain")
    ws.run(cmd)
    y, sr = sfile.read(wav_out, dtype="float32")
    if sr != SR:
        y = resample(y, sr)
    return y


def resample(y, sr):
    with tempfile.TemporaryDirectory() as td:
        a, b = Path(td) / "a.wav", Path(td) / "b.f32"
        sfile.write(a, y, sr)
        ws.run(["ffmpeg", "-y", "-v", "error", "-i", str(a), "-ac", "1", "-ar", str(SR), "-f", "f32le", str(b)])
        return np.fromfile(b, dtype=np.float32)


def trim(y, db=-45, pre=0.05, post=0.2):
    nz = np.where(np.abs(y) > 10 ** (db / 20))[0]
    return y[max(0, nz[0] - int(pre * SR)):nz[-1] + int(post * SR)] if len(nz) else y


def hf_render(comp, variables, out):
    ws.run(["npx", "hyperframes", "render", "-c", f"compositions/{comp}.html", "--variables", json.dumps(variables, ensure_ascii=False),
            "-o", str(out), "--quiet", "."], cwd=HF)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--flow", help="Flow 원장님 컷(8초). 없으면 사진 + edge-tts 로 임시")
    ap.add_argument("--crop", action="append", default=[], help="대표 사진 가로 구간 a-b(0~1), 여러 번 주면 차례로")
    ap.add_argument("--pos", default="50% 40%", help="훅 화면에서 사진의 중심(object-position)")
    ap.add_argument("--pan", type=int, default=60)
    ap.add_argument("--voice", choices=["first", "tts"], default="first")
    ap.add_argument("--out")
    a = ap.parse_args()

    draft = next((d for d in json.loads(DRAFT.read_text())["items"] if d["slug"] == a.slug), None)
    if not draft:
        sys.exit(f"{a.slug} 가 {DRAFT.name} 에 없다")
    work = ROOT / "video/work/top10" / a.slug
    work.mkdir(parents=True, exist_ok=True)
    item = load_item(a.slug, work)
    cues = item["cues"]
    out = ROOT / (a.out or f"video/out/shorts/top10/{a.slug}.mp4")
    out.parent.mkdir(parents=True, exist_ok=True)

    # ---- 재료 ----
    hero = work / "hero.jpg"
    if not hero.exists():
        src = fetch(item["heroImage"], work / "hero.src")
        ws.run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-q:v", "2", str(hero)])
    iw, ih = map(int, ws.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0",
                              str(hero)]).stdout.strip().split(","))
    mp3 = fetch(item["audio"], work / "audio.mp3")
    pcm = ws.decode(mp3)
    sil = ws.silences(mp3)

    # ---- 소리 조각 ----
    q_end = item.get("questionAudio", {}).get("end") or cues[0]["start"]
    mc = trim(pcm[:int((q_end + 0.1) * SR)], post=0.15)          # MC 질문 — 훅 밑에 깐다
    r = draft["reveal"]
    if r != list(range(r[0], r[-1] + 1)):
        sys.exit("reveal 은 이어진 자막 번호여야 한다 — 건너뛰면 말이 중간에서 튄다")
    ra = cues[r[0]]["start"] - 0.12
    nxt = cues[r[-1] + 1]["start"] if r[-1] + 1 < len(cues) else len(pcm) / SR
    rb = min(cues[r[-1]]["end"] + 0.25, nxt - 0.05)               # 다음 자막(결론) 첫소리가 새어 들어가지 않게
    ans = pcm[int(ra * SR):int(rb * SR)].copy()
    # 시드 cue 끝은 쉼 한가운데쯤이라 뒤에 1초 가까운 무음이 붙는다 — 잠금 화면 앞 1.5초 쉼 규칙에 걸렸다(p4-01 시험판)
    nz = np.where(np.abs(ans) > 10 ** (-45 / 20))[0]
    ans = ans[:nz[-1] + int(0.2 * SR)]
    fade = int(0.03 * SR)
    ans[-fade:] *= np.linspace(1, 0, fade)
    lock_v = ws.tts_line(f"{draft['lock']} {LOCK_TAIL}", work / "lock.mp3")
    outro = ws.tts_line(ws.OUTRO_LINE, work / "outro.mp3")
    line2 = ws.tts_line(ws.DOMAIN_LINE, work / "outro2.mp3")

    if a.flow:
        flow_src = ROOT / a.flow
        fw = work / "flow.wav"
        ws.run(["ffmpeg", "-y", "-v", "error", "-i", str(flow_src), "-vn", "-ac", "1", "-ar", str(SR), str(fw)])
        fy, _ = sfile.read(fw, dtype="float32")
        # Flow 는 말 앞에 1초 넘게 뜸을 들인다(소개 쇼츠 ① 1.6초) — 말 구간만 쓰고 영상도 같은 자리부터
        nz = np.where(np.abs(fy) > 10 ** (-40 / 20))[0]
        f0 = max(0.0, nz[0] / SR - 0.15)
        f1 = min(len(fy) / SR, nz[-1] / SR + 0.3)
        if a.voice == "first":
            emp = vc(flow_src, work / "flow-first.wav", plain_voice=False)
        else:
            emp = fy
        emp = emp[int(f0 * SR):int(f1 * SR)]
    else:
        f0 = 0.0
        emp = ws.tts_line(draft["empathy"], work / "empathy.mp3")
        print("!! Flow 컷 없음 — 원장님 한마디를 사진 + edge-tts 로 임시로 채운다")

    # ---- 시간표 ----
    GAP = 0.2
    t_hook = len(mc) / SR + GAP
    t_emp = t_hook + len(emp) / SR + GAP
    t_ans = t_emp + len(ans) / SR + 0.1
    lock_dur = max(3.2, len(lock_v) / SR + 0.6)
    main_dur = t_ans + lock_dur

    # 원장님 몫을 한 줄로 이어 붙여 한 번에 음색을 바꾼다(조각마다 바꾸면 조각마다 음색이 조금씩 달라진다)
    E = ws.ending(main_dur, outro, line2, *cards(work, a.slug), work / "ending.mp4")
    total = E["total"]
    host = np.zeros(int(total * SR) + SR // 10, dtype=np.float32)
    flowtrack = np.zeros_like(host)
    mctrack = np.zeros_like(host)

    def put(track, clip, at):
        o = int(at * SR)
        track[o:o + len(clip)] += clip[:len(track) - o]

    put(mctrack, mc, 0)
    if a.flow:
        put(flowtrack, emp, t_hook)
    else:
        put(host, emp, t_hook)
    put(host, ans, t_emp)
    lock_at = t_ans + 0.2
    put(host, lock_v, lock_at)
    put(host, outro, E["outro_at"])
    put(host, line2, E["line2_at"])
    if a.voice == "first":
        hw = work / "host.wav"
        sfile.write(hw, host, SR)
        host = vc(hw, work / "host-first.wav", plain_voice=True)[:len(host)]
        host = np.pad(host, (0, len(mctrack) - len(host)))
    mix = mctrack + flowtrack + host
    raw = work / "mix.f32"
    mix.astype(np.float32).tofile(raw)

    # ---- 자막 ----
    f = ws.font("Bold", ws.SUB_SIZE)
    subs = []
    for p, s, e in ws.time_pieces({"start": 0, "end": len(emp) / SR - 0.15}, ws.pieces_of(draft["empathy"], f), []):
        subs.append({"text": p, "from": t_hook + s, "to": t_hook + e})
    for cue in cues[r[0]:r[-1] + 1]:
        for p, s, e in ws.time_pieces(cue, ws.pieces_of(cue["ko"], f), sil):
            subs.append({"text": p, "from": t_emp + (s - ra), "to": t_emp + (e - ra)})
    for i in range(len(subs) - 1):
        if subs[i + 1]["from"] - subs[i]["to"] < 0.4:
            subs[i]["to"] = subs[i + 1]["from"]

    # ---- 그림: HyperFrames 장면 ----
    pub = RM / "public" / a.slug
    pub.mkdir(parents=True, exist_ok=True)
    (RM / "public/fonts").mkdir(parents=True, exist_ok=True)
    for fn in ("Pretendard-Bold.otf", "Pretendard-Black.otf"):
        shutil.copy(HF / "assets" / fn, RM / "public/fonts" / fn)
    hfa = HF / "assets/top10" / a.slug
    hfa.mkdir(parents=True, exist_ok=True)
    shutil.copy(hero, hfa / "hero.jpg")
    shutil.copy(hero, pub / "hero.jpg")
    hf_render("hook", {"photo": f"../assets/top10/{a.slug}/hero.jpg", "hook": draft["hook"], "pos": a.pos}, pub / "hook.mp4")
    hf_render("lock", {"question": ws.clean(item["question"]).strip(), "lock": draft["lock"]}, pub / "lock.mp4")

    # ---- 그림: Remotion 본편 ----
    segs = [{"kind": "scene", "src": f"{a.slug}/hook.mp4", "from": 0, "to": t_hook}]
    if a.flow:
        shutil.copy(ROOT / a.flow, pub / "flow.mp4")
        segs.append({"kind": "flow", "src": f"{a.slug}/flow.mp4", "from": t_hook, "to": t_emp, "mediaStart": f0})
        photo_from = t_emp
    else:
        photo_from = t_hook
    crops = [tuple(map(float, c.split("-"))) for c in a.crop] or [None]
    n = len(crops)
    starts = [s["from"] for s in subs if s["from"] > photo_from + 1]
    bnd = [photo_from] + [min(starts, key=lambda x: abs(x - (photo_from + (t_ans - photo_from) * k / n))) for k in range(1, n)] + [t_ans]
    for k, c in enumerate(crops):
        seg = {"kind": "photo", "src": f"{a.slug}/hero.jpg", "iw": iw, "ih": ih, "from": bnd[k], "to": bnd[k + 1], "pan": a.pan}
        if c:
            seg["crop"] = list(c)
        segs.append(seg)
    segs.append({"kind": "scene", "src": f"{a.slug}/lock.mp4", "from": t_ans, "to": main_dur})
    props = {"duration": round(main_dur, 3), "part": f"PART {item['part']} · {item['partTitle'].split(' (')[0]}",
             "question": ws.clean(item["question"]).strip(), "segments": segs, "subs": subs}
    pj = work / "props.json"
    pj.write_text(json.dumps(props, ensure_ascii=False, indent=1))
    body = work / "body.mp4"
    ws.run(["npx", "remotion", "render", "src/index.ts", "Teaser", str(body), f"--props={pj}", "--log=error"], cwd=RM)

    # ---- 끝 카드를 잇고 소리를 합친다 ----
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", str(raw),
                           "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    m = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    fg = (f"[0:v]format=yuv420p,setsar=1,fps={FPS},settb=AVTB[m];[1:v]format=yuv420p,setsar=1,fps={FPS},settb=AVTB[c];"
          f"[m][c]xfade=transition=slideup:duration={E['XF']}:offset={E['card_start']:.3f}[v];"
          f"[2:a]alimiter=limit=0.3:attack=2:release=60:level=disabled,{ln},aresample=48000[a]")
    ws.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(body), "-i", str(work / "ending.mp4"),
            "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", str(raw), "-filter_complex", fg,
            "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}", "-r", str(FPS),
            "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)])

    # ---- 검사(앞선 여섯 편과 같은 기준) ----
    vdur = float(ws.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)]).stdout)
    i, tp = ws.lufs(out)
    long_sil = ws.silences(out, 1.5)
    print(f"출력 {out.relative_to(ROOT)}  ({'Flow' if a.flow else '임시: Flow 없음'}, 목소리 {a.voice})")
    print(f"길이 {vdur:.2f}초 (60초 이하: {'예' if vdur <= 60 else '아니오'})")
    print(f"음량 {i:.1f} LUFS, 순간 최대 {tp:.1f} dBFS")
    print(f"1.5초 넘는 무음: {long_sil or '없음'}")
    print(f"훅 0~{t_hook:.2f} · 한마디 ~{t_emp:.2f} · 답 앞부분(자막 {r[0]}~{r[-1]}, 원본 {ra:.1f}~{rb:.1f}초) ~{t_ans:.2f} · "
          f"잠금 ~{main_dur:.2f} · 끝 {total:.2f}")
    for s in subs:
        print(f"  {s['from']:6.2f}-{s['to']:6.2f}  {s['text']}")


def cards(work, slug):
    # 끝 카드 주소는 그 문항 페이지로 — 잠긴 문항도 페이지에 앞부분과 구매 안내가 있다
    layers = work / "layers"
    layers.mkdir(exist_ok=True)
    ws.make_card(slug, layers / "card.png")
    ws.make_domain_card(layers / "domain.png")
    return layers / "card.png", layers / "domain.png"


if __name__ == "__main__":
    main()
