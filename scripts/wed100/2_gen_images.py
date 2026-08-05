#!/usr/bin/env python3
"""
질문별 일러스트(SVG) 생성기 — 질문 1개당 hero(16:9) + thumb(1:1) 2장.

입력 : src/data/wed100.json
출력 : public/wed100/img/{slug}-hero.svg
        public/wed100/img/{slug}-thumb.svg

- 외부 이미지/폰트 의존 없음(저작권 안전), 벡터라 어떤 해상도에서도 선명
- PART별 컬러 테마 + 모티프로 시각적 챕터 구분
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "src", "data", "wed100.json")
OUTDIR = os.path.join(ROOT, "public", "wed100", "img")

FONT = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif"

# PART별 테마: (배경 그라디언트 2색, 포인트색, 잉크색, 모티프키, 라벨)
THEMES = {
    1: (("#FBF6F0", "#F0DFD2"), "#A63D5A", "#3B2B2F", "checklist", "업체 선정 및 예약"),
    2: (("#F7F4FA", "#E4DCED"), "#6E4477", "#312B3A", "consult", "사전 컨설팅 및 준비"),
    3: (("#FDF4F3", "#F5D9D6"), "#B0475A", "#3A2A2C", "makeup", "혼주 메이크업"),
    4: (("#F5F7F5", "#DDE7DF"), "#3F6B57", "#26332C", "hair", "혼주 헤어스타일"),
    5: (("#FBF8F0", "#EFE1C4"), "#9A7B33", "#37301F", "hanbok", "의상·퍼스널컬러·액세서리"),
    6: (("#F4F6FA", "#D9E2F0"), "#3C5A86", "#242E3D", "wedding", "결혼식 당일"),
}


def esc(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;"))


def wrap(text: str, per_line: int):
    """한국어 기준 글자수 래핑(어절 보존)."""
    words, lines, cur = text.split(" "), [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        if len(cand) <= per_line or not cur:
            cur = cand
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def motif(kind: str, accent: str, cx: float, cy: float, s: float) -> str:
    """PART별 라인 아트 모티프 (stroke 기반, 단색 accent)."""
    a = accent
    g = f'<g transform="translate({cx},{cy}) scale({s})" fill="none" stroke="{a}" ' \
        f'stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">'
    body = {
        # 체크리스트 / 예약
        "checklist": (
            '<rect x="-46" y="-58" width="92" height="116" rx="10"/>'
            '<path d="M-46 -34 H46"/>'
            '<path d="M-28 -8 l10 10 l22 -24"/><path d="M12 -2 H32"/>'
            '<path d="M-28 26 l10 10 l22 -24"/><path d="M12 32 H32"/>'
            '<circle cx="-22" cy="-58" r="6"/><circle cx="22" cy="-58" r="6"/>'
        ),
        # 상담 / 거울 + 말풍선
        "consult": (
            '<ellipse cx="-14" cy="-6" rx="40" ry="48"/>'
            '<path d="M-14 42 v22 M-30 64 H2"/>'
            '<path d="M24 -46 h44 a10 10 0 0 1 10 10 v28 a10 10 0 0 1 -10 10 h-24 '
            'l-14 14 v-14 a10 10 0 0 1 -6 -10 v-28 a10 10 0 0 1 10 -10 z"/>'
        ),
        # 메이크업 브러시 + 팔레트
        "makeup": (
            '<path d="M-52 54 L14 -12"/><path d="M2 -24 l22 22 l-14 14 l-22 -22 z"/>'
            '<path d="M16 -38 l24 -24 a12 12 0 0 1 18 18 l-24 24 z"/>'
            '<circle cx="-30" cy="-34" r="26"/><circle cx="-30" cy="-34" r="8"/>'
        ),
        # 헤어 / 올림머리 + 빗
        "hair": (
            '<path d="M-34 44 c-14 -34 -8 -74 22 -84 c30 -10 52 14 46 44"/>'
            '<path d="M-12 -40 c18 -18 44 -10 46 12 c2 20 -16 26 -30 18"/>'
            '<path d="M-34 44 h68"/>'
            '<path d="M34 -20 h34 a6 6 0 0 1 6 6 v10 h-46 v-10 a6 6 0 0 1 6 -6 z"/>'
            '<path d="M30 -4 v18 M42 -4 v18 M54 -4 v18 M66 -4 v18"/>'
        ),
        # 한복 저고리 + 진주
        "hanbok": (
            '<path d="M-52 -34 c16 -18 34 -26 52 -26 c18 0 36 8 52 26"/>'
            '<path d="M-52 -34 l-8 42 l22 8"/><path d="M52 -34 l8 42 l-22 8"/>'
            '<path d="M-38 16 h76 v34 h-76 z"/>'
            '<path d="M0 -58 v46 l-22 26"/>'
            '<circle cx="0" cy="-2" r="7"/><circle cx="-20" cy="-14" r="5"/>'
            '<circle cx="20" cy="-14" r="5"/>'
        ),
        # 예식 당일 / 반지 + 조명
        "wedding": (
            '<circle cx="-16" cy="14" r="30"/><circle cx="20" cy="14" r="30"/>'
            '<path d="M-16 -30 l-10 12 h20 z"/>'
            '<path d="M-56 -46 l-10 -16 M0 -54 v-18 M58 -46 l10 -16"/>'
        ),
    }[kind]
    return g + body + "</g>"


def hero_svg(item: dict) -> str:
    (c1, c2), accent, ink, mk, label = THEMES[item["part"]]
    W, H = 1600, 900
    qlines = wrap(item["question"], 22)[:3]
    en = item.get("question_en", "")
    enlines = wrap(en, 52)[:2]

    q = "".join(
        f'<tspan x="120" dy="{0 if i == 0 else 84}">{esc(l)}</tspan>'
        for i, l in enumerate(qlines)
    )
    e = "".join(
        f'<tspan x="120" dy="{0 if i == 0 else 34}">{esc(l)}</tspan>'
        for i, l in enumerate(enlines)
    )
    qy = 400 - (len(qlines) - 1) * 26

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{esc(item['question'])}">
<defs>
 <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/>
 </linearGradient>
 <radialGradient id="glow" cx="0.78" cy="0.28" r="0.6">
  <stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/>
  <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
 </radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg)"/>
<rect width="{W}" height="{H}" fill="url(#glow)"/>
<path d="M1180 0 C1300 220 1240 520 1420 900 L1600 900 L1600 0 Z" fill="{accent}" opacity="0.07"/>
<circle cx="1245" cy="330" r="235" fill="#ffffff" opacity="0.55"/>
<circle cx="1245" cy="330" r="235" fill="none" stroke="{accent}" stroke-width="1.5" opacity="0.35"/>
{motif(mk, accent, 1245, 330, 1.55)}
<rect x="56" y="56" width="{W-112}" height="{H-112}" fill="none" stroke="{accent}" stroke-width="1" opacity="0.28"/>
<text x="120" y="168" font-family="{FONT}" font-size="26" letter-spacing="8" fill="{accent}" font-weight="700">PART {item['part']}</text>
<text x="120" y="212" font-family="{FONT}" font-size="30" fill="{ink}" opacity="0.62">{esc(label)}</text>
<text x="120" y="330" font-family="{FONT}" font-size="150" font-weight="900" fill="{accent}" opacity="0.16">{item['n']:02d}</text>
<text x="120" y="{qy}" font-family="{FONT}" font-size="62" font-weight="700" fill="{ink}" letter-spacing="-1">{q}</text>
<text x="120" y="{qy + 84 * len(qlines) + 26}" font-family="{FONT}" font-size="25" fill="{ink}" opacity="0.55">{e}</text>
<line x1="120" y1="{H-150}" x2="330" y2="{H-150}" stroke="{accent}" stroke-width="3"/>
<text x="120" y="{H-96}" font-family="{FONT}" font-size="27" letter-spacing="3" fill="{ink}" opacity="0.7">혼주메이크업 100문 100답 · 메이크업포엘</text>
</svg>'''


def thumb_svg(item: dict) -> str:
    (c1, c2), accent, ink, mk, label = THEMES[item["part"]]
    S = 800
    qlines = wrap(item["question"], 15)[:3]
    q = "".join(
        f'<tspan x="70" dy="{0 if i == 0 else 52}">{esc(l)}</tspan>'
        for i, l in enumerate(qlines)
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}" role="img" aria-label="{esc(item['question'])}">
<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient></defs>
<rect width="{S}" height="{S}" fill="url(#b)"/>
<circle cx="605" cy="205" r="150" fill="#ffffff" opacity="0.5"/>
{motif(mk, accent, 605, 205, 1.0)}
<text x="70" y="118" font-family="{FONT}" font-size="20" letter-spacing="6" fill="{accent}" font-weight="700">PART {item['part']}</text>
<text x="70" y="330" font-family="{FONT}" font-size="104" font-weight="900" fill="{accent}" opacity="0.18">{item['n']:02d}</text>
<text x="70" y="{470 - (len(qlines)-1)*16}" font-family="{FONT}" font-size="42" font-weight="700" fill="{ink}">{q}</text>
<line x1="70" y1="700" x2="200" y2="700" stroke="{accent}" stroke-width="3"/>
<text x="70" y="742" font-family="{FONT}" font-size="21" fill="{ink}" opacity="0.65">메이크업포엘</text>
</svg>'''


def main():
    data = json.load(open(DATA, encoding="utf-8"))
    os.makedirs(OUTDIR, exist_ok=True)
    n = 0
    for it in data["items"]:
        with open(os.path.join(OUTDIR, f"{it['slug']}-hero.svg"), "w", encoding="utf-8") as f:
            f.write(hero_svg(it))
        with open(os.path.join(OUTDIR, f"{it['slug']}-thumb.svg"), "w", encoding="utf-8") as f:
            f.write(thumb_svg(it))
        n += 2
    print(f"[OK] {n}개 SVG 생성 → {OUTDIR}")


if __name__ == "__main__":
    main()
