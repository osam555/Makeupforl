"""i2v 쇼츠 한 편 조립(파일럿 p4-18). 소리 먼저: Typecast 토막을 0.35초 쉼으로 잇고 토막=장면."""
import json, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[3]  # 저장소 뿌리 — worktree 경로를 박아 두면 worktree 를 지우는 순간 깨진다
sys.path.insert(0, str(REPO / "scripts/video"))
import wed100_short as ws  # noqa: E402

W, H, FPS = ws.W, ws.H, ws.FPS
GAP, SR, HEAD_Y = 0.35, 48000, 150
ENC = ["-c:v", "libx264", "-crf", "16", "-preset", "veryfast", "-pix_fmt", "yuv420p"]


def run(cmd):
    subprocess.run([str(c) for c in cmd], check=True)


def font(weight, size):
    p = Path(ws.FONT_DIR) / f"Pretendard-{weight}.otf"
    return ws.ImageFont.truetype(str(p if p.exists() else Path(ws.FONT_DIR) / "Pretendard-Bold.otf"), size)


def overlay_png(path, head=False, caption=None, hook=None, lock=None):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if head:
        d.text((60, HEAD_Y), "메이크업포엘", font=font("Bold", 44), fill=ws.INK)
        d.text((W - 60, HEAD_Y), "혼주 메이크업 100문 100답", font=font("Bold", 44), fill=ws.INK, anchor="ra")
    if hook:
        f = font("Black", 88)
        y = 1150
        for ln in hook.split("\n"):
            b = ws.box_text(ln, f, pad=(34, 20), alpha=230)
            img.alpha_composite(b, ((W - b.width) // 2, y)); y += b.height + 18
    if lock:
        cx, cy = W // 2, 700
        d.rounded_rectangle([cx - 70, cy - 20, cx + 70, cy + 90], radius=16, fill=ws.GOLD)
        d.arc([cx - 48, cy - 95, cx + 48, cy + 5], 180, 360, fill=ws.GOLD, width=20)
        d.line([cx - 48, cy - 45, cx - 48, cy - 15], fill=ws.GOLD, width=20)
        d.line([cx + 48, cy - 45, cx + 48, cy - 15], fill=ws.GOLD, width=20)
        size = 66
        while size > 44 and max(ws.text_w(ln, font("Black", size)) for ln in lock) > W - 160:
            size -= 2
        f, y = font("Black", size), 880
        for ln in lock:
            b = ws.box_text(ln, f, pad=(34, 20), alpha=235)
            img.alpha_composite(b, ((W - b.width) // 2, y)); y += b.height + 18
    if caption:
        b = ws.box_text(caption, font("Bold", ws.SUB_SIZE))
        img.alpha_composite(b, ((W - b.width) // 2, ws.SUB_CY - b.height // 2))
    img.save(path)


def scene_video(sc, dur, src_dir, out):
    frames = round(dur * FPS)
    if sc.get("clip"):
        run(["ffmpeg", "-v", "error", "-y", "-i", src_dir / sc["clip"], "-vf",
             f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1,"
             # 클립(8초)보다 긴 장면은 마지막 프레임으로 채운다. 3초로 고정했더니 11초 넘는 장면에서 영상이 모자라
             # 뒤 장면이 밀리고 끝 잠금 화면이 잘렸다(2026-11-14 p5-10)
             f"tpad=stop_mode=clone:stop_duration={dur:.3f},trim=duration={dur:.3f}", "-an", *ENC, out])
        return
    blur = ",gblur=sigma=14" if sc.get("blur") else ""
    z = sc.get("zoom", 0.06)
    run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", src_dir / sc["still"], "-vf",
         f"scale={W*2}:{H*2}:force_original_aspect_ratio=increase,crop={W*2}:{H*2},"
         f"zoompan=z='1+{z}*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}{blur},setsar=1",
         "-frames:v", frames, *ENC, out])


def dur_of(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                                capture_output=True, text=True).stdout)


def caption_pieces(text, start, end):
    pieces = ws.pieces_of(text, font("Bold", ws.SUB_SIZE))
    tot = sum(ws.syl(p) for p in pieces)
    out, t = [], start
    for p in pieces:
        e = t + (end - start) * ws.syl(p) / tot
        out.append((p, t, e)); t = e
    return out


def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    ws.FONT_DIR = Path(spec["font_dir"]); ws.font = font
    src, voice, out = (REPO / spec[k] for k in ("dir", "voice_dir", "out"))  # 절대경로면 / 가 그대로 둔다
    segs = {s["seg"]: s for s in json.load(open(voice / "segments.json", encoding="utf-8"))}
    out.parent.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="i2v-"))

    t, audio, scenes, caps = 0.0, [], [], []
    for sc in spec["scenes"]:
        s0 = t
        for name in sc["segs"]:
            seg = segs[name]
            audio.append((voice / f"{name}.wav", t))
            if sc.get("caption", True):
                caps += caption_pieces(seg["text"], t, t + seg["dur"])
            t += seg["dur"] + GAP
        scenes.append((sc, s0, t - s0))
    main_dur = t

    parts = []
    for i, (sc, s0, d) in enumerate(scenes):
        p = work / f"s{i:02d}.mp4"; scene_video(sc, d, src, p); parts.append(p)
    (work / "list.txt").write_text("".join(f"file '{p}'\n" for p in parts))
    body = work / "body.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", work / "list.txt", "-c", "copy", body])

    head = work / "head.png"; overlay_png(head, head=True)
    layers = [(head, 0, main_dur)]
    for i, (sc, s0, d) in enumerate(scenes):
        if sc.get("hook") or sc.get("lock"):
            p = work / f"o{i:02d}.png"; overlay_png(p, hook=sc.get("hook"), lock=sc.get("lock"))
            layers.append((p, s0, s0 + d))
    for j, (txt, a, b) in enumerate(caps):
        p = work / f"c{j:02d}.png"; overlay_png(p, caption=txt); layers.append((p, a, b))
    inputs, chain, last = ["-i", body], [], "0:v"
    for k, (p, a, b) in enumerate(layers, start=1):
        inputs += ["-loop", "1", "-framerate", FPS, "-t", f"{main_dur:.3f}", "-i", p]
        chain.append(f"[{last}][{k}:v]overlay=0:0:shortest=0:eof_action=pass:enable='between(t,{a:.3f},{b:.3f})'[v{k}]"); last = f"v{k}"
    main_v = work / "main.mp4"
    run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(chain), "-map", f"[{last}]", *ENC, "-r", FPS, main_v])

    card, dom = work / "card.png", work / "domain.png"
    ws.make_card(spec.get("slug"), card); ws.make_domain_card(dom)
    end = ws.ending(main_dur, np.zeros(int(segs[spec.get("outro_seg","07-outro")]["dur"] * ws.SR)),
                    np.zeros(int(segs[spec.get("domain_seg","08-domain")]["dur"] * ws.SR)), card, dom, work / "end.mp4")
    audio += [(voice / (spec.get("outro_seg","07-outro") + ".wav"), end["outro_at"]), (voice / (spec.get("domain_seg","08-domain") + ".wav"), end["line2_at"])]

    v_all = work / "v.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", main_v, "-i", work / "end.mp4", "-filter_complex",
         f"[0:v][1:v]xfade=transition=slideup:duration={end['XF']}:offset={end['card_start']:.3f}[v]",
         "-map", "[v]", *ENC, "-r", FPS, v_all])
    total = dur_of(v_all)
    a_in, a_f = [], []
    for k, (p, at) in enumerate(audio):
        a_in += ["-i", p]; ms = int(at * 1000)
        a_f.append(f"[{k}:a]aresample={SR},adelay={ms}|{ms}[a{k}]")
    mix = "".join(f"[a{k}]" for k in range(len(audio)))
    a_f.append(f"{mix}amix=inputs={len(audio)}:normalize=0,apad,atrim=0:{total:.3f},loudnorm=I=-14:TP=-1.5:LRA=11[a]")
    wav = work / "mix.wav"
    run(["ffmpeg", "-v", "error", "-y", *a_in, "-filter_complex", ";".join(a_f), "-map", "[a]", "-ar", SR, "-ac", 1, "-c:a", "pcm_s24le", wav])
    run(["ffmpeg", "-v", "error", "-y", "-i", v_all, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out])
    print(f"out {out}  {dur_of(out):.2f}s  main {main_dur:.2f}s  captions {len(caps)}  work {work}")


if __name__ == "__main__":
    main()
