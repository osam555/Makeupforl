"""100문100답 무료 문항 하나를 9:16 쇼츠로 — 상품에 이미 있는 음성·사진·자막만 엮는다.

왜 촬영도 AI 얼굴도 없이 가나: 상품을 산 분이 듣는 소리와 같은 소리를 들려줘야 「들어 본 그대로 산다」가 된다.
원장님 얼굴을 새로 그리는 길(Flow·HeyGen)은 일관성 때문에 접었다(docs/video/README.md 1절).

왜 PIL 로 글씨를 그리나: 이 맥의 ffmpeg(homebrew 기본 빌드)에는 drawtext·subtitles 필터가 없다.
글씨는 전부 PNG 로 그려 overlay 로 얹는다. 덕분에 자막 폭을 픽셀로 재서 **한 줄**을 지킬 수 있다
(makeupforl-video 스킬: 자막은 두 줄 금지 — 긴 문장은 연속 자막으로 쪼갠다).

자막 시각: 시드의 cues 는 문장 단위라 한 줄에 안 들어간다. 문장을 한 줄 조각으로 쪼개고
음절 수 비율로 시각을 나눈 뒤, 경계를 가까운 쉼(-45dB)으로 끌어당긴다. edge-tts 는 말 빠르기가
고르므로 이 정도면 낱말 하나 안쪽으로 맞는다. -45dB 인 까닭은 스킬 1절(한국어 말끝이 -30dB대에서 잘린다).

끝 카드: 카드 동안 소리가 비면 「1.5초 넘는 무음 없음」 검사에 걸린다. 배경음악은 쓰지 않기로 해서
(효과 과장 금지·저작권), 답변과 같은 목소리(edge-tts SunHi +25%)로 마무리 한 줄을 읽힌다.

실행:
  video/work/.venv/bin/python scripts/video/wed100_short.py p3-15 \
      --hook "결혼식 날 눈물 나면 화장 어떡하죠?" --cut 49.3- --out video/out/shorts/01-p3-15-눈물_v1.mp4
  --cut 은 원본 음성 기준 초(a-b, 끝을 비우면 끝까지). 여러 번 줄 수 있다. 쉼 자리에서 자를 것.
PIL 은 시스템 python 에 없어 video/work/.venv 에 깔았다(pip install pillow numpy edge-tts).
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
FONT_DIR = Path.home() / "Downloads/Pretendard-1.3.9"
W, H, FPS = 1080, 1920, 30
SR = 24000  # 문항 음성 규격(24kHz 모노) 그대로 — 이어붙일 마무리 음성도 여기에 맞춘다

CREAM, CREAM2 = (247, 241, 232), (238, 229, 215)
GOLD, INK, SUB, NAVY = (176, 141, 87), (46, 38, 34), (122, 98, 74), (34, 38, 46)

# 화면 배치 — 유튜브 쇼츠는 아래 ~350px 에 채널명·설명, 오른쪽에 단추가 덮인다. 자막은 그 위에.
PHOTO_Y, PHOTO_H = 420, 1160
SUB_CY = 1455           # 자막 가운데 — 사진 아랫부분 위에 얹어 흰 반투명 박스가 읽히게
SUB_MAX_W = 940         # 자막 글줄 최대 폭(좌우 70px 여백)
SUB_SIZE = 68           # 스킬 기준 1080p 72 — 세로 화면은 폭이 1080 이라 한 줄 글자 수를 조금 더 확보
SNAP = 0.6              # 자막 경계를 쉼으로 끌어당기는 최대 거리(초)

OUTRO_LINE = "더 궁금하신 점은, 혼주메이크업 100문 100답에서 확인하세요."


def font(weight, size):
    return ImageFont.truetype(str(FONT_DIR / f"Pretendard-{weight}.otf"), size)


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


def load_item(slug):
    d = json.load(open(ROOT / "src/data/wed100.json"))
    items = d if isinstance(d, list) else d["items"]
    for it in items:
        if it["slug"] == slug:
            return it
    sys.exit(f"{slug} 가 시드에 없다")


def decode(path):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def silences(path, d=0.2):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af",
                          f"silencedetect=noise=-45dB:d={d}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", err)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    return list(zip(st, en + [None] * (len(st) - len(en))))


# ---------- 자막 쪼개기 ----------

def text_w(s, f):
    return f.getbbox(s)[2] if s else 0


def clean(s):
    s = s.replace("\n", " ")
    s = re.sub(r"([.,])(?=[가-힣A-Za-z])", r"\1 ", s)   # 「방지합니다.메이크업」「만나,내」처럼 띄어쓰기가 빠진 데가 있다
    s = re.sub(r"\s+", " ", s).strip()
    # 따옴표는 뺀다 — 문장이 한 줄 조각으로 갈리면 짝이 깨져 「'까만」「때,"」처럼 반쪽만 남는다
    s = re.sub(r"[\"'”’]\s+(라고|하고|이라)", r"\1", s)   # 「참고해주세요" 라고」 → 따옴표를 빼면 「요 라고」로 벌어진다
    s = re.sub(r"[\"'“”‘’]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def strip_piece(s):
    # 쇼츠 자막 끝의 쉼표·마침표는 읽는 데 보탬이 안 되고 박스만 넓힌다. 물음표는 뜻이 있어 남긴다
    s = s.strip().strip(",").strip()
    return re.sub(r"[.]+$", "", s).strip()


# 끊으면 안 되는 자리. 처음엔 좌·우 폭만 맞춰 잘랐더니(스킬 5절) 「특별한 / 방법을」「번질 / 우려를」처럼
# 꾸미는 말과 받는 말이 갈렸고 「등 모든」처럼 의존명사가 줄 머리로 갔다. 읽는 사람이 다음 줄을 기다려야 한다.
DEPENDENT = {"등", "것", "때", "수", "중", "뿐", "정도", "데", "때는", "것을", "것이", "수건을"}
PARTICLE_END = set("은는을를이가고며서여에게도면데죠와과로까니해요다")  # 「만」은 「까만」 때문에 뺐다


def break_pen(prev, nxt):
    pen = 0
    if nxt in DEPENDENT or nxt.rstrip(",") in DEPENDENT:
        pen += 60
    last = prev.rstrip(",.?!")[-1:]
    if last and "가" <= last <= "힣" and last not in PARTICLE_END and not prev.endswith(","):
        jong = (ord(last) - 0xAC00) % 28
        if jong in (4, 8):          # ㄴ·ㄹ 받침 = 대개 꾸미는 말(특별한·번질·쉬운)
            pen += 35
    return pen


def split_fit(s, f):
    """한 줄(SUB_MAX_W)에 들어가는 조각들로 나눈다 — 조각 수는 적게, 길이는 고르게, 나쁜 자리는 피해서(DP)."""
    words = s.split(" ")
    n = len(words)
    best = [0.0] + [float("inf")] * n
    back = [0] * (n + 1)
    for j in range(1, n + 1):
        for i in range(j - 1, -1, -1):
            w = text_w(" ".join(words[i:j]), f)
            if w > SUB_MAX_W and j - i > 1:
                break
            cost = best[i] + 40 + ((SUB_MAX_W - min(w, SUB_MAX_W)) / 100) ** 2
            if j < n:
                cost += break_pen(words[j - 1], words[j])
            if cost < best[j]:
                best[j], back[j] = cost, i
    out, j = [], n
    while j > 0:
        out.append(" ".join(words[back[j]:j]))
        j = back[j]
    return out[::-1]


def pieces_of(text, f):
    # 먼저 마침표·쉼표 자리(말이 실제로 쉬는 곳)로 나누고, 이웃끼리 한 줄에 들어가면 다시 붙인다
    clauses = [c for c in re.split(r"(?<=[.,?!])\s+", clean(text)) if c.strip()]
    # 「단,」「즉,」처럼 한두 음절짜리 마디는 혼자 0.5초 떴다 사라져 읽을 새가 없다 — 다음 마디에 붙인다
    glued = []
    for c in clauses:
        if glued and syl(glued[-1]) <= 2 and not re.search(r"[.?!]$", glued[-1]):
            glued[-1] = glued[-1] + " " + c
        else:
            glued.append(c)
    clauses = glued
    merged = []
    for c in clauses:
        if merged and not re.search(r"[.?!]$", merged[-1]) and text_w(strip_piece(merged[-1] + " " + c), f) <= SUB_MAX_W:
            merged[-1] = merged[-1] + " " + c
        else:
            merged.append(c)
    out = []
    for c in merged:
        out += split_fit(strip_piece(c), f)
    return [p for p in out if p]


def syl(s):
    return max(1, len(re.findall(r"[가-힣0-9A-Za-z]", s)))


def time_pieces(cue, pieces, sil):
    s, e = cue["start"], cue["end"]
    tot = sum(syl(p) for p in pieces)
    mids = [(a + b) / 2 for a, b in sil if b is not None and s < (a + b) / 2 < e]
    bounds, acc = [s], 0
    for p in pieces[:-1]:
        acc += syl(p)
        t = s + (e - s) * acc / tot
        near = min(mids, key=lambda m: abs(m - t), default=None)
        if near is not None and abs(near - t) <= SNAP and near > bounds[-1] + 0.4:
            t = near
        bounds.append(t)
    bounds.append(e)
    return [(p, bounds[i], bounds[i + 1]) for i, p in enumerate(pieces)]


# ---------- 그림 ----------

def gradient(w, h):
    a = np.linspace(0, 1, h)[:, None, None]
    arr = (np.array(CREAM) * (1 - a) + np.array(CREAM2) * a).astype(np.uint8)
    return Image.fromarray(np.repeat(arr, w, axis=1), "RGB")


def draw_shadow_text(img, xy, s, f, fill, anchor="la"):
    d = ImageDraw.Draw(img)
    x, y = xy
    d.text((x + 2, y + 2), s, font=f, fill=(255, 255, 255, 140), anchor=anchor)  # 흰 55% 그림자
    d.text((x, y), s, font=f, fill=fill, anchor=anchor)


def wrap_title(s, f, maxw):
    if text_w(s, f) <= maxw:
        return [s]
    return split_fit_w(s, f, maxw)


def split_fit_w(s, f, maxw):
    best = None
    for m in re.finditer(" ", s):
        a, b = s[:m.start()], s[m.end():]
        cost = max(text_w(a, f), text_w(b, f))
        if best is None or cost < best[0]:
            best = (cost, a, b)
    return [best[1], best[2]] if best else [s]


def make_base(item, path):
    """크림 바탕 + 상단 브랜드 두 줄 + 질문 제목. 사진은 ffmpeg 에서 천천히 흘린다."""
    img = gradient(W, H).convert("RGBA")
    hf = font("Bold", 38)
    draw_shadow_text(img, (44, 70), "메이크업포엘", hf, NAVY)
    draw_shadow_text(img, (W - 44, 70), "혼주 메이크업 100문 100답", hf, NAVY, anchor="ra")
    d = ImageDraw.Draw(img)
    d.text((W // 2, 176), f"PART {item['part']} · {item['partTitle'].split(' (')[0]}",
           font=font("Bold", 34), fill=GOLD, anchor="ma")
    tf = font("Black", 62)
    q = "Q. " + clean(item["question"]).strip()
    lines = wrap_title(q, tf, W - 120)
    y = 236 if len(lines) == 1 else 222
    for ln in lines:
        d.text((W // 2, y), ln, font=tf, fill=INK, anchor="ma")
        y += 80
    d.rectangle([0, PHOTO_Y - 6, W, PHOTO_Y - 1], fill=GOLD)
    d.rectangle([0, PHOTO_Y + PHOTO_H, W, PHOTO_Y + PHOTO_H + 5], fill=GOLD)
    d.text((W // 2, PHOTO_Y + PHOTO_H + 46), "전체 답변 · makeupforl.co.kr/honjoo100",
           font=font("Medium", 32), fill=SUB, anchor="ma")
    img.save(path)


def make_photo(item, path, pan):
    """대표 사진을 사진 칸보다 크게 잘라 둔다 — ffmpeg 가 그 안에서 천천히 옆으로 흘린다(정지 화면이면 넘긴다)."""
    src = Image.open(ROOT / "public" / item["heroImage"].lstrip("/")).convert("RGB")
    tw, th = W + pan, PHOTO_H
    ph = json.load(open(ROOT / "src/data/wed100-photos.json"))["photos"]
    fx = next((p["focus"][0] for p in ph if p["name"] == item.get("photo")), 0.5)
    scale = th / src.height
    if src.width * scale < tw:
        scale = tw / src.width
    big = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    cx = min(max(fx * big.width, tw / 2), big.width - tw / 2)
    left, top = round(cx - tw / 2), round((big.height - th) / 2)
    big.crop((left, top, left + tw, top + th)).save(path)


def make_panel(item, crop, path, pan):
    """hero 의 가로 구간 하나를 사진 칸에 넣는다 — 다 보이게(contain) 넣고 빈 곳은 같은 사진을 흐리게 깐다.

    hero(1600×900)를 통째로 꽉 채워 자르면(make_photo) 맞지 않는 사진이 많았다:
    hair-14·hair-15 는 두 장을 이어 붙인 사진이라 가운데 이음매와 손만 남고, hair-29 는 세로 사진을
    흐린 띠 위에 얹은 hero 라 띠 경계가 보이고, 귀걸이(accessory-02)는 한 짝이 잘렸다.
    그래서 보여 줄 구간을 --crop 으로 받아 한 장씩 차례로 보여 준다.
    """
    src = Image.open(ROOT / "public" / item["heroImage"].lstrip("/")).convert("RGB")
    x0, x1 = crop
    reg = src.crop((round(x0 * src.width), 0, round(x1 * src.width), src.height))
    cw, ch = W + pan, PHOTO_H
    cover = max(cw / reg.width, ch / reg.height)
    bg = reg.resize((round(reg.width * cover), round(reg.height * cover)), Image.LANCZOS)
    bg = bg.crop(((bg.width - cw) // 2, (bg.height - ch) // 2, (bg.width - cw) // 2 + cw, (bg.height - ch) // 2 + ch))
    bg = Image.blend(bg.filter(ImageFilter.GaussianBlur(28)), Image.new("RGB", bg.size, CREAM), 0.25)
    # 꽉 채워도 양쪽이 12% 안쪽으로만 잘리면 채우고, 더 잘리면 다 보이게 줄인다
    sc = cover if (reg.width * cover - W) / (reg.width * cover) <= 0.12 else min(W / reg.width, ch / reg.height)
    fg = reg.resize((round(reg.width * sc), round(reg.height * sc)), Image.LANCZOS)
    if fg.width > cw or fg.height > ch:
        l, t = max(0, (fg.width - cw) // 2), max(0, (fg.height - ch) // 2)
        fg = fg.crop((l, t, l + min(cw, fg.width), t + min(ch, fg.height)))
    bg.paste(fg, ((cw - fg.width) // 2, (ch - fg.height) // 2))
    bg.save(path)


def box_text(s, f, pad=(30, 16), alpha=128, fill=(16, 16, 16), radius=12):
    """흰 반투명 박스 + 검정 글씨(스킬 5절 — 중장년층에게 가장 잘 읽힌다)."""
    l, t, r, b = f.getbbox(s)
    asc, desc = f.getmetrics()
    w, h = r + pad[0] * 2, asc + desc + pad[1] * 2
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=(255, 255, 255, alpha))
    d.text((pad[0], pad[1]), s, font=f, fill=fill)
    return img


def make_hook(hook, path):
    """첫 2초 — 사진 칸을 살짝 어둡게 하고 가운데에 큰 질문. 제목이라 두 줄까지 허용한다(자막이 아니다)."""
    img = Image.new("RGBA", (W, PHOTO_H), (0, 0, 0, 70))
    f = font("Black", 84)
    lines = wrap_title(hook, f, W - 140)
    boxes = [box_text(ln, f, pad=(34, 20), alpha=225) for ln in lines]
    # 사진 가운데는 얼굴 자리라 훅 글씨로 덮으면 첫 화면에 사람이 안 보인다 — 아래 1/3 에 둔다
    y = int(PHOTO_H * 0.80) - sum(b.height for b in boxes) - 18 * (len(boxes) - 1)
    for b in boxes:
        img.alpha_composite(b, ((W - b.width) // 2, y))
        y += b.height + 18
    img.save(path)


def make_card(slug, path):
    img = gradient(W, H).convert("RGBA")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 14], fill=GOLD)
    d.rectangle([0, H - 14, W, H], fill=GOLD)
    cx = W // 2
    d.text((cx, 400), "메이크업포엘", font=font("Bold", 46), fill=SUB, anchor="ma")
    d.rectangle([cx - 90, 486, cx + 90, 490], fill=GOLD)
    d.text((cx, 540), "혼주메이크업", font=font("Black", 96), fill=INK, anchor="ma")
    d.text((cx, 660), "100문 100답", font=font("Black", 116), fill=GOLD, anchor="ma")
    d.text((cx, 860), f"makeupforl.co.kr/honjoo100/{slug}", font=font("Bold", 44), fill=INK, anchor="ma")
    bf = font("Bold", 50)
    s = "30초 설문 — 궁금한 점 알아보기"
    bw = text_w(s, bf) + 90
    d.rounded_rectangle([cx - bw // 2, 980, cx + bw // 2, 1080], radius=50, outline=GOLD, width=5,
                        fill=(255, 255, 255, 200))
    d.text((cx, 1030), s, font=bf, fill=INK, anchor="mm")
    d.text((cx, 1180), "전화 02-323-3321", font=font("Bold", 56), fill=INK, anchor="ma")
    img.save(path)


# ---------- 조립 ----------

def parse_cuts(cuts, dur):
    out = []
    for c in cuts:
        a, b = c.split("-")
        out.append((float(a), float(b) if b else dur))
    return sorted(out)


def keep_ranges(cuts, dur):
    keep, t = [], 0.0
    for a, b in cuts:
        if a > t:
            keep.append((t, a))
        t = max(t, b)
    if t < dur:
        keep.append((t, dur))
    return keep


def to_out(t, keep):
    acc = 0.0
    for a, b in keep:
        if a <= t <= b:
            return acc + t - a
        acc += b - a
    return None


def clamp(s, e, keep):
    best = None
    for a, b in keep:
        lo, hi = max(s, a), min(e, b)
        if hi - lo > 0.3 and (best is None or hi - lo > best[1] - best[0]):
            best = (lo, hi)
    return best if best else (None, None)


def lufs(path):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)[-1]
    tp = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", err)[-1]
    return float(i), float(tp)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--hook", required=True)
    ap.add_argument("--cut", action="append", default=[])
    ap.add_argument("--out", required=True)
    ap.add_argument("--pan", type=int, default=120, help="사진이 옆으로 흐르는 거리(px)")
    ap.add_argument("--crop", action="append", default=[],
                    help="hero 가로 구간 a-b(0~1). 여러 번 주면 차례로 넘긴다. 없으면 hero 를 꽉 채워 자른다")
    a = ap.parse_args()

    item = load_item(a.slug)
    work = ROOT / "video/work/shorts" / a.slug
    work.mkdir(parents=True, exist_ok=True)
    src = work / "audio.mp3"
    if not src.exists():
        urllib.request.urlretrieve(item["audio"], src)

    pcm = decode(src)
    dur = len(pcm) / SR
    sil = silences(src)
    keep = keep_ranges(parse_cuts(a.cut, dur), dur)

    # 소리: 남길 구간을 잇되 자른 자리는 15ms 로 살짝 흐려 딸깍 소리를 없앤다
    fade = int(0.015 * SR)
    parts = []
    for s, e in keep:
        seg = pcm[int(s * SR):int(e * SR)].copy()
        seg[:fade] *= np.linspace(0, 1, fade)
        seg[-fade:] *= np.linspace(1, 0, fade)
        parts.append(seg)
    body = np.concatenate(parts)
    main_dur = len(body) / SR + 0.3

    outro_mp3 = work / "outro.mp3"
    if not outro_mp3.exists():
        # homebrew 의 edge-tts 는 낡아서 403(Sec-MS-GEC)으로 막힌다 — 같은 venv 의 최신판을 쓴다
        run([str(Path(sys.executable).parent / "edge-tts"), "--voice", "ko-KR-SunHiNeural", "--rate=+25%", "--text", OUTRO_LINE,
             "--write-media", str(outro_mp3) + ".part"])
        Path(str(outro_mp3) + ".part").rename(outro_mp3)  # 실패해 빈 파일이 남으면 다음 실행이 그걸 집어 든다
    outro = decode(outro_mp3)
    # 앞뒤 무음을 걷어 내야 카드가 뜨자마자 말이 시작된다
    nz = np.where(np.abs(outro) > 10 ** (-45 / 20))[0]
    outro = outro[max(0, nz[0] - int(0.05 * SR)):nz[-1] + int(0.2 * SR)]

    XF = 0.55  # 카드 진입 slideup(스킬 2절)
    card_start = main_dur - XF
    outro_at = card_start + XF + 0.2
    card_dur = (outro_at - card_start) + len(outro) / SR + 0.7
    total = card_start + card_dur
    audio = np.zeros(int(total * SR) + SR // 10, dtype=np.float32)
    audio[:len(body)] = body
    o = int(outro_at * SR)
    audio[o:o + len(outro)] += outro
    raw_wav = work / "mix.f32"
    audio.tofile(raw_wav)

    # 자막 조각
    sf = font("Bold", SUB_SIZE)
    q_end = item.get("questionAudio", {}).get("end", 0)
    first_ans = min(c["start"] for c in item["cues"])
    hook_end = to_out(max(first_ans, 2.0), keep)
    subs = []
    for cue in item["cues"]:
        for p, s, e in time_pieces(cue, pieces_of(cue["ko"], sf), sil):
            # 자른 자리는 쉼에 맞추므로 시드 cue 경계(쉼 한가운데쯤)와 조금 어긋난다 — 남긴 구간 안으로 당겨 넣는다.
            # 안 그러면 자른 자리 바로 뒤 첫 자막이 통째로 빠진다(p1-06 「1:1 사전 컨설팅 과정을 통해」)
            s, e = clamp(s, e, keep)
            if s is None:
                continue  # 잘라 낸 구간의 자막
            so, eo = to_out(s, keep), to_out(e, keep)
            subs.append([p, so, eo])
    for i in range(len(subs) - 1):  # 0.4초 안쪽 틈은 메워 깜빡임을 없앤다
        if subs[i + 1][1] - subs[i][2] < 0.4:
            subs[i][2] = subs[i + 1][1]

    layers = work / "layers"
    layers.mkdir(exist_ok=True)
    for old in layers.glob("*.png"):
        old.unlink()
    make_base(item, layers / "base.png")
    crops = [tuple(map(float, c.split("-"))) for c in a.crop]
    panels = []
    if crops:
        for k, c in enumerate(crops):
            make_panel(item, c, layers / f"photo{k}.png", a.pan)
            panels.append(layers / f"photo{k}.png")
    else:
        make_photo(item, layers / "photo0.png", a.pan)
        panels.append(layers / "photo0.png")
    make_hook(a.hook, layers / "hook.png")
    make_card(a.slug, layers / "card.png")
    sub_files = []
    for i, (p, s, e) in enumerate(subs):
        fn = layers / f"sub{i:03d}.png"
        im = box_text(p, sf)
        if im.width > W - 40:
            print(f"!! 폭 초과 {im.width}px: {p}")
        im.save(fn)
        sub_files.append((fn, s, e))

    # 필터 그래프
    # 사진이 여러 장이면 고르게 나누되, 넘기는 자리는 가까운 자막 시작으로 맞춘다(말 중간에 그림이 바뀌지 않게)
    PX = 0.45  # 사진 넘김 smoothleft(스킬 2절 본편 컷 연결과 같은 길이)
    n = len(panels)
    starts = [s for _, s, _ in sub_files]
    cuts_t = [min(starts, key=lambda x: abs(x - main_dur * k / n)) for k in range(1, n)] if n > 1 else []
    bnd = [0.0] + cuts_t + [main_dur]
    lens = [(bnd[k + 1] - bnd[k]) + (PX / 2 if k > 0 else 0) + (PX / 2 if k < n - 1 else 0) for k in range(n)]
    inputs = ["-loop", "1", "-framerate", str(FPS), "-t", f"{main_dur:.3f}", "-i", str(layers / "base.png"),
              "-loop", "1", "-framerate", str(FPS), "-t", f"{main_dur:.3f}", "-i", str(layers / "hook.png")]
    for fn, _, _ in sub_files:
        inputs += ["-i", str(fn)]
    pi = 2 + len(sub_files)
    for k, pp in enumerate(panels):
        inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{lens[k]:.3f}", "-i", str(pp)]
    ci = pi + n
    inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{card_dur:.3f}", "-i", str(layers / "card.png")]
    ai = ci + 1
    inputs += ["-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", str(raw_wav)]

    fg = [f"[{pi + k}:v]crop={W}:{PHOTO_H}:x='{a.pan}*t/{lens[k]:.3f}':y=0,setsar=1,format=yuv420p[p{k}]" for k in range(n)]
    prev = "p0"
    for k in range(1, n):
        fg.append(f"[{prev}][p{k}]xfade=transition=smoothleft:duration={PX}:offset={bnd[k] - PX / 2:.3f}[px{k}]")
        prev = f"px{k}"
    fg += [f"[0:v][{prev}]overlay=0:{PHOTO_Y}[v0]",
           f"[v0][1:v]overlay=0:{PHOTO_Y}:enable='lt(t,{hook_end:.3f})'[v1]"]
    last = "v1"
    for k, (_, s, e) in enumerate(sub_files):
        s = max(s, hook_end)
        if e <= s:
            continue
        nxt = f"s{k}"
        fg.append(f"[{last}][{2 + k}:v]overlay=x=(W-w)/2:y={SUB_CY}-h/2:enable='between(t,{s:.3f},{e:.3f})'[{nxt}]")
        last = nxt
    fg.append(f"[{last}]format=yuv420p,setsar=1[mainv]")
    fg.append(f"[{ci}:v]format=yuv420p,setsar=1[cardv]")
    fg.append(f"[mainv][cardv]xfade=transition=slideup:duration={XF}:offset={card_start:.3f}[v]")

    # 음량: 두 번 재서 -14 LUFS 에 선형으로 맞춘다(한 번 재기는 동적으로 눌러 숨소리가 출렁인다)
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", str(raw_wav),
                           "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    m = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    fg.append(f"[{ai}:a]{ln},aresample=48000[a]")

    out = ROOT / a.out
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as fh:
        fh.write(";\n".join(fg))
        script = fh.name
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs,
                    "-filter_complex_script", script, "-map", "[v]", "-map", "[a]",
                    "-t", f"{total:.3f}", "-r", str(FPS),
                    "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)

    # 검사
    vdur = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)]).stdout)
    i, tp = lufs(out)
    long_sil = [(s, e) for s, e in silences(out, 1.5)]
    (work / "subs.json").write_text(json.dumps(subs, ensure_ascii=False, indent=1))
    print(f"출력 {out.relative_to(ROOT)}")
    print(f"길이 {vdur:.2f}초 (60초 이하: {'예' if vdur <= 60 else '아니오'})")
    print(f"음량 {i:.1f} LUFS, 순간 최대 {tp:.1f} dBFS")
    print(f"1.5초 넘는 무음: {long_sil or '없음'}")
    print(f"자막 {len(subs)}조각, 훅 0~{hook_end:.2f}초, 끝 카드 {card_start + XF:.2f}~{total:.2f}초")
    for p, s, e in subs:
        print(f"  {s:6.2f}-{e:6.2f}  {p}")


if __name__ == "__main__":
    main()
