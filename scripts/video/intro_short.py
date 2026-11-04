"""소개 쇼츠 「처음 혼주가 되세요?」 조립 — 원장님 세 덩어리(Flow) 사이에 채널 B롤과 /honjoo100 화면을 끼운다.

샷 목록은 video/scripts/01-100문100답-소개.md. 화면 틀·자막·끝 카드는 무료 문항 쇼츠(wed100_short.py)와
똑같이 쓴다 — 여섯 편이 한 시리즈로 보여야 하고, 같은 틀이면 원장님 컷도 가슴 위까지만 잘려
Veo 워터마크(오른쪽 아래 반짝이)가 사진 칸 밖으로 빠진다. 가리개를 따로 덧대는 것보다 깔끔하다.

소리는 한 트랙이다(Flow 는 클립마다 목소리를 새로 만들어 사람이 바뀐다 — docs/video/README.md 1절):
  ① block1-v3-blend.mp4 에 이미 입이 맞춰진 복제 음성
  B롤·화면 녹화 구간은 tts-solo.wav 의 해당 줄
  ②③ 은 align_voice.py 로 Flow 입 박자에 맞춘 복제 음성
줄 시각은 받아쓰기가 아니라 tts-solo.wav.lines/ 의 줄별 길이로 계산한다. whisper 의 줄 경계는
「처음 혼주가 되세요?」를 1.06초에 끝냈는데 실제 소리는 1.9초까지 이어졌다 — 자막이 먼저 사라진다.

B롤은 원장님 채널 쇼츠라 자막이 화면 안에 박혀 있다. 박힌 자막 띠를 피해 자르고(CROP 표의 y),
손님 얼굴이 보이는 컷(이모지로 가린 컷 포함)과 외국인 스톡 모델 컷은 고르지 않았다.

실행:  video/work/.venv/bin/python scripts/video/intro_short.py [출력.mp4]
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
import wed100_short as ws  # noqa: E402

ROOT = ws.ROOT
V = ROOT / "video"
W, FPS, SH, SY = ws.W, ws.FPS, ws.PHOTO_H, ws.PHOTO_Y
SR = 24000
PX = 0.45          # 덩어리 사이 smoothleft(스킬 2절)

SOLO = V / "work/tts-solo.wav"
LINES = V / "work/tts-solo.wav.lines"
SCRIPT = V / "scripts/01-낭독용.txt"

# 자막 — 01 대본의 「자막」 절(낭독용은 발음 때문에 「백문백답」「메이크업 포엘」로 적어 둔 것이라 화면용과 다르다)
SUBS = {
    0: "처음 혼주가 되세요?", 1: "궁금한 건 많은데, 어디 물어볼 곳도 없어 답답하셨죠?",
    2: "혼주가 궁금한 건 따로 있습니다", 4: "어떤 혼주 헤어가 내게 어울리는지",
    5: "어떻게 해야 젊고 세련된 혼주가 되는지", 6: "안경은 써도 될까? 눈물이 날 땐 어떡하지?",
    7: "한복 색깔을 고르는 기준까지", 9: "우리 혼주님들이 가장 궁금해하시는 질문 100가지를",
    10: "〈혼주메이크업 100문 100답〉에 모두 담았습니다", 11: "결혼식 준비가 훨씬 편안해지는, 전문가의 100가지 답변",
    13: "결혼식 날, 품위와 아름다움 모두 놓치지 마세요", 14: "혼주에 진심인 메이크업포엘입니다",
}

# B롤: (파일, 시작초, x, y, w, h) — w/h 는 사진 칸 비율(1080:1160)에 맞춰 잘라 둔다
BROLL = {
    4: ("raw/channel/b6TcOAifXo4.mp4", 36.0, 355, 0, 570, 612),       # 뒷머리 핀 고정, 아래 자막 띠 위로(105초 쪽은 흰 동그라미 표시가 있다)
    5: ("raw/channel/1RlKXZqrqZc.mp4", 22.0, 0, 40, 608, 653),        # 흰 저고리 뒷모습
    "6a": ("raw/channel/7XLXe7fPwA4.mp4", 2.5, 0, 60, 608, 653),      # 안경 진열
    "6b": ("raw/channel/r0C1JqMEngE.mp4", 22.0, 0, 50, 608, 653),     # 젖은 면봉 — 눈물 번짐 수습
    7: ("raw/channel/B5i9l9937uo.mp4", 15.0, 25, 470, 558, 600),      # 저고리·치마 색, 위쪽 자막 상자 테두리까지 피해서
}


def run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)


def line_times():
    """tts-solo.wav 를 만든 규칙(clone_tts.py: 줄마다 0.35초, 빈 줄 0.6초)을 그대로 되짚어 줄별 시각을 낸다."""
    files = {int(p.name[:2]): p for p in LINES.glob("*.wav")}
    t, out = 0.0, {}
    for i, line in enumerate(SCRIPT.read_text(encoding="utf-8").splitlines()):
        if not line.strip():
            t += 0.6
            continue
        d = sf.info(files[i]).duration
        out[i] = (t, t + d)
        t += d + 0.35
    return out


def speech_spans(path, n):
    """②③ 은 늘이고 줄인 소리라 줄 경계를 쉼에서 다시 찾는다 — 가장 긴 쉼 n-1 개가 줄 사이다."""
    sil = [(a, b) for a, b in ws.silences(path, 0.25) if b is not None]
    dur = sf.info(path).duration
    inner = sorted([s for s in sil if s[0] > 0.3 and s[1] < dur - 0.2], key=lambda s: s[0] - s[1])[:n - 1]
    inner.sort()
    starts = [next((b for a, b in sil if a <= 0.05), 0.0)] + [b for a, b in inner]
    ends = [a for a, b in inner] + [next((a for a, b in sil if b >= dur - 0.05), dur)]
    return list(zip(starts, ends))


def slot_clip(src, out, start, dur, crop, scroll=None):
    """원본 한 구간을 사진 칸(1080×1160) 크기 영상으로. scroll 이면 긴 화면 캡처를 위에서 아래로 내린다."""
    if scroll:
        y1 = scroll
        vf = (f"crop={W}:{SH}:0:'{y1}*(1-cos(PI*min(t/{dur:.3f},1)))/2',setsar=1,fps={FPS},format=yuv420p")
        cmd = ["ffmpeg", "-y", "-v", "error", "-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", str(src)]
    else:
        x, y, w, h = crop
        vf = (f"crop={w}:{h}:{x}:{y},scale={W}:{SH}:flags=lanczos,unsharp=5:5:0.4:5:5:0,"
              f"setsar=1,fps={FPS},format=yuv420p")
        cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(src)]
    run(cmd + ["-an", "-vf", vf, "-t", f"{dur:.3f}", "-c:v", "libx264", "-crf", "14", "-preset", "veryfast", str(out)])


def frac_crop(w, h, y0=0.05):
    """원장님 컷: 폭은 그대로, 높이는 칸 비율로 — 머리 위 5% 에서 시작하면 가슴 위까지 들어오고 워터마크는 빠진다."""
    ch = round(w * SH / W)
    return (0, round(h * y0), w, ch)


def main():
    out = ROOT / (sys.argv[1] if len(sys.argv) > 1 else "video/out/shorts/00-소개-처음혼주_v1.mp4")
    work = V / "work/intro/build"
    work.mkdir(parents=True, exist_ok=True)
    lt = line_times()
    solo = ws.decode(SOLO)

    def solo_cut(a, b):
        return solo[int(a * SR):int(b * SR)]

    b1 = V / "work/lipsync/block1-v3-blend.mp4"
    b2 = V / "work/lipsync/block2-v2-aligned.mp4"
    b3 = V / "work/intro/block3-aligned.mp4"
    dur = lambda p: float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                          "csv=p=0", str(p)], capture_output=True, text=True).stdout)

    segs = []   # (이름, 길이, 소리 numpy, 자막 [(줄번호, 시작, 끝)] 덩어리 안 시각)
    # ① 원장님 — 줄 0~2
    a1 = ws.decode(b1)
    segs.append(("A", dur(b1), a1, [(i, *lt[i]) for i in (0, 1, 2)]))
    # B롤 — 줄 4~7. 줄 사이 쉼은 solo 그대로(0.35·0.6초)
    s0, s1 = lt[4][0] - 0.15, lt[7][1] + 0.35
    segs.append(("B", s1 - s0, solo_cut(s0, s1), [(i, lt[i][0] - s0, lt[i][1] - s0) for i in (4, 5, 6, 7)]))
    # ② 원장님 — 줄 9·10
    a2 = ws.decode(b2)
    tmpw = work / "b2.wav"
    sf.write(tmpw, a2, SR)
    sp2 = speech_spans(tmpw, 2)
    segs.append(("C", dur(b2), a2, [(9, *sp2[0]), (10, *sp2[1])]))
    # 화면 녹화 — 줄 11
    d0, d1 = lt[11][0] - 0.15, lt[11][1] + 0.3
    segs.append(("D", d1 - d0, solo_cut(d0, d1), [(11, 0.15, lt[11][1] - d0)]))
    # ③ 원장님 — 줄 13·14
    a3 = ws.decode(b3)
    tmpw3 = work / "b3.wav"
    sf.write(tmpw3, a3, SR)
    sp3 = speech_spans(tmpw3, 2)
    segs.append(("E", dur(b3), a3, [(13, *sp3[0]), (14, *sp3[1])]))

    # 덩어리별 칸 영상
    clips = []
    for name, d, _, subs in segs:
        f = work / f"{name}.mp4"
        if name == "A":
            slot_clip(b1, f, 0, d, frac_crop(406, 720))
        elif name == "C":
            slot_clip(b2, f, 0, d, frac_crop(720, 1280))
        elif name == "E":
            slot_clip(b3, f, 0, d, frac_crop(1080, 1920))
        elif name == "D":
            slot_clip(V / "work/intro/honjoo100-tall.png", f, 0, d, None, scroll=2300)
        else:
            # 줄마다 B롤 한 컷, 6번 줄은 안경 / 눈물 두 컷. 컷 경계는 줄 사이 쉼 한가운데
            t_in = {i: (a, b) for i, a, b in subs}
            cuts = [0.0]
            for i in (5, 6, 7):
                cuts.append((t_in[i - 1][1] + t_in[i][0]) / 2)
            cuts.append(d)
            q = t_in[6]
            mid6 = q[0] + (q[1] - q[0]) * 0.47   # 「안경은 써도 될까?」 / 「눈물이 날 땐 어떡하지?」 음절 비
            parts, keys = [], [4, 5, "6a", "6b", 7]
            bounds = [cuts[0], cuts[1], cuts[2], mid6, cuts[3], cuts[4]]
            for k, key in enumerate(keys):
                src, st, x, y, w, h = BROLL[key]
                pf = work / f"B{k}.mp4"
                slot_clip(V / src, pf, st, bounds[k + 1] - bounds[k], (x, y, w, h))
                parts.append(pf)
            lst = work / "B.txt"
            lst.write_text("".join(f"file '{p}'\n" for p in parts))
            run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(f)])
        clips.append(f)

    # 시각표 — 덩어리 k 는 T[k] 에 시작. 뒤 덩어리와의 smoothleft 는 앞 덩어리 끝을 멈춘 채 PX 만큼 늘려 만든다
    T, t = [], 0.0
    for _, d, _, _ in segs:
        T.append(t)
        t += d
    main_dur = t   # ③ 끝의 미소(약 1초 무음)가 이미 꼬리 노릇을 한다 — 더 늘이면 카드까지 1.5초 무음에 걸린다

    # 끝 카드 마무리 한 줄 — 같은 복제 음성(clone_tts.py)으로 「궁금한 건, 메이크업 포엘 백문백답에서 들어 보세요.」
    outro = ws.decode(V / "work/intro/outro-clone.wav")
    nz = np.where(np.abs(outro) > 10 ** (-45 / 20))[0]
    outro = outro[max(0, nz[0] - int(0.05 * SR)):nz[-1] + int(0.2 * SR)]
    XF = 0.55
    card_start = main_dur - XF
    outro_at = card_start + 0.35   # 카드가 올라오는 도중에 말을 시작해 ③ 미소 뒤 무음을 1초 안쪽으로
    card_dur = (outro_at - card_start) + len(outro) / SR + 0.7
    total = card_start + card_dur

    audio = np.zeros(int((total + 0.2) * SR), dtype=np.float32)
    for (name, d, a, _), t0 in zip(segs, T):
        a = a[:int(d * SR)]
        o = int(t0 * SR)
        audio[o:o + len(a)] += a
    o = int(outro_at * SR)
    audio[o:o + len(outro)] += outro
    raw = work / "mix.f32"
    audio.tofile(raw)

    # 자막 조각(무료 문항 쇼츠와 같은 쪼개기)
    sf_ = ws.font("Bold", ws.SUB_SIZE)
    subs_out = []
    for (name, d, _, subs), t0 in zip(segs, T):
        for i, a, b in subs:
            cue = {"start": t0 + a, "end": t0 + b, "ko": SUBS[i]}
            subs_out += [list(x) for x in ws.time_pieces(cue, ws.pieces_of(SUBS[i], sf_), [])]
    for i in range(len(subs_out) - 1):
        if subs_out[i + 1][1] - subs_out[i][2] < 0.4:
            subs_out[i][2] = subs_out[i + 1][1]
    hook_end = subs_out[1][1] if len(subs_out) > 1 else 2.0   # 첫 줄 「처음 혼주가 되세요?」가 곧 훅
    subs_out = subs_out[1:]

    layers = work / "layers"
    layers.mkdir(exist_ok=True)
    for old in layers.glob("*.png"):
        old.unlink()
    item = {"part": 0, "partTitle": "대표원장 김성희", "question": "혼주메이크업 100문 100답"}
    make_base(item, layers / "base.png")
    ws.make_hook("처음 혼주가 되세요?", layers / "hook.png")
    ws.make_card("", layers / "card.png")
    sub_files = []
    d_from, d_to = T[3], T[4]
    for k, (p, s, e) in enumerate(subs_out):
        fn = layers / f"sub{k:03d}.png"
        # /honjoo100 화면 위에서는 반투명 흰 박스 뒤로 페이지 글자가 비쳐 자막과 엉킨다 — 그 구간만 거의 불투명하게
        im = ws.box_text(p, sf_, alpha=230 if d_from - 0.1 <= s < d_to else 128)
        if im.width > W - 40:
            print(f"!! 폭 초과 {im.width}px: {p}")
        im.save(fn)
        sub_files.append((fn, s, e))

    inputs = ["-loop", "1", "-framerate", str(FPS), "-t", f"{main_dur:.3f}", "-i", str(layers / "base.png"),
              "-loop", "1", "-framerate", str(FPS), "-t", f"{main_dur:.3f}", "-i", str(layers / "hook.png")]
    for fn, _, _ in sub_files:
        inputs += ["-i", str(fn)]
    ci0 = 2 + len(sub_files)
    for c in clips:
        inputs += ["-i", str(c)]
    cardi = ci0 + len(clips)
    inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{card_dur:.3f}", "-i", str(layers / "card.png")]
    ai = cardi + 1
    inputs += ["-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", str(raw)]

    fg = []
    n = len(clips)
    for k in range(n):
        pad = PX if k < n - 1 else 0.3
        fg.append(f"[{ci0 + k}:v]tpad=stop_mode=clone:stop_duration={pad},setsar=1,format=yuv420p[c{k}]")
    prev = "c0"
    for k in range(1, n):
        fg.append(f"[{prev}][c{k}]xfade=transition=smoothleft:duration={PX}:offset={T[k]:.3f}[x{k}]")
        prev = f"x{k}"
    fg += [f"[0:v][{prev}]overlay=0:{SY}[v0]",
           f"[v0][1:v]overlay=0:{SY}:enable='lt(t,{hook_end:.3f})'[v1]"]
    last = "v1"
    for k, (_, s, e) in enumerate(sub_files):
        fg.append(f"[{last}][{2 + k}:v]overlay=x=(W-w)/2:y={ws.SUB_CY}-h/2:enable='between(t,{s:.3f},{e:.3f})'[s{k}]")
        last = f"s{k}"
    fg += [f"[{last}]format=yuv420p,setsar=1[mainv]", f"[{cardi}:v]format=yuv420p,setsar=1[cardv]",
           f"[mainv][cardv]xfade=transition=slideup:duration={XF}:offset={card_start:.3f}[v]"]
    # 복제 음성은 순간 최대치가 튀어서 선형 loudnorm 이 -14 까지 못 올린다(-15.1 에서 멈췄다).
    # 튀는 머리만 리미터로 먼저 눌러 두면 선형으로 맞출 수 있다 — 동적 모드는 말 사이 숨소리가 출렁인다
    LIM = "alimiter=limit=0.3:attack=2:release=60:level=disabled"
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", str(raw),
                           "-af", f"{LIM},loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    m = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
    fg.append(f"[{ai}:a]{LIM},loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
              f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:"
              f"linear=true,aresample=48000[a]")
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as fh:
        fh.write(";\n".join(fg))
        script = fh.name
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs, "-filter_complex_script", script,
                    "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}", "-r", str(FPS),
                    "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)

    vdur = dur(out)
    i_, tp = ws.lufs(out)
    print(f"출력 {out.relative_to(ROOT)}")
    print(f"길이 {vdur:.2f}초 (60초 이하: {'예' if vdur <= 60 else '아니오'})")
    print(f"음량 {i_:.1f} LUFS, 순간 최대 {tp:.1f} dBFS")
    print(f"1.5초 넘는 무음: {ws.silences(out, 1.5) or '없음'}")
    print("덩어리 시작: " + ", ".join(f"{s[0]} {t0:.2f}" for s, t0 in zip(segs, T)) + f", 끝 카드 {card_start + XF:.2f}")
    for p, s, e in subs_out:
        print(f"  {s:6.2f}-{e:6.2f}  {p}")


def make_base(item, path):
    """무료 문항 쇼츠의 바탕과 같되, 위 제목 자리에 「PART …」 대신 대표원장 이름을 둔다."""
    from PIL import Image, ImageDraw
    img = ws.gradient(W, ws.H).convert("RGBA")
    hf = ws.font("Bold", 38)
    ws.draw_shadow_text(img, (44, 70), "메이크업포엘", hf, ws.NAVY)
    ws.draw_shadow_text(img, (W - 44, 70), "혼주 메이크업 100문 100답", hf, ws.NAVY, anchor="ra")
    d = ImageDraw.Draw(img)
    d.text((W // 2, 176), item["partTitle"], font=ws.font("Bold", 34), fill=ws.GOLD, anchor="ma")
    d.text((W // 2, 236), item["question"], font=ws.font("Black", 62), fill=ws.INK, anchor="ma")
    d.rectangle([0, SY - 6, W, SY - 1], fill=ws.GOLD)
    d.rectangle([0, SY + SH, W, SY + SH + 5], fill=ws.GOLD)
    d.text((W // 2, SY + SH + 46), "makeupforl.co.kr/honjoo100", font=ws.font("Medium", 32), fill=ws.SUB, anchor="ma")
    img.save(path)


if __name__ == "__main__":
    main()
