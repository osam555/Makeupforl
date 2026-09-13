#!/usr/bin/env python3
"""
인스타그램 게시물을 사이트 시드(src/data/instagram.json)와 사진(public/instagram/)으로 옮긴다.

인스타그램은 robots.txt 로 네이버(Yeti)를 비롯한 거의 모든 검색엔진을 막는다. 그래서
네이버에서 "메이크업포엘" 을 찾으면 인스타 계정은 "robots.txt 로 인해 정보를 수집할 수
없습니다" 로만 뜬다. 거기 올린 글과 사진이 검색에 잡히려면 우리 사이트에 있어야 한다.

인스타그램은 로그인 없이 긁을 수 없고 API 도 비즈니스 계정 연동이 필요해서, 게시물 수집은
사람이 로그인한 브라우저(Aside)에 시킨다. 그 결과 JSON 을 이 스크립트에 넘긴다:

    python3 scripts/instagram/build.py --src <aside 가 돌려준 json>

입력 형식: {"profile": {...}, "posts": [{url, date, caption, images: [cdn url...], likes, pinned}]}

사진은 cdninstagram 주소가 며칠이면 만료되므로(oe= 파라미터) 반드시 내려받아 우리 쪽에 둔다.
가로 1080 으로 줄이고 JPEG 82 로 저장한다 — 인스타 원본과 같은 폭이라 화질 손해는 없고,
저장소에 들어가는 크기는 장당 100~200KB 다. 이미 있는 파일은 다시 받지 않는다.
"""
from __future__ import annotations

import argparse
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / 'src' / 'data' / 'instagram.json'
PHOTOS = ROOT / 'public' / 'instagram'

MAX_W = 1080
QUALITY = 82

# 게시물마다 반복되는 연락처 블록. 본문이 아니라 서명이라 시드에서는 뺀다 —
# 전화번호는 푸터에 있고, 카카오톡 아이디(atobio)는 이미 옛것이다.
BOILERPLATE = re.compile(
    r'^(?:[_\-–—\s]+$'  # 구분선 "-", "_" (빈 줄은 문단 나눔이라 남긴다)
    r'|.*𝙈\s*𝘼\s*𝙆\s*𝙀.*$'  # "✨ 𝙈 𝘼 𝙆 𝙀 𝙐 𝙋 𝙁 𝙊 𝙍 𝙇"
    r'|.*카카오톡\s*문의.*$'
    r'|.*전화\s*문의.*$'
    r')',
)
HASHTAG = re.compile(r'#([^\s#]+)')


def shortcode(url: str) -> str:
    m = re.search(r'/(?:p|reel)/([A-Za-z0-9_-]+)', url)
    if not m:
        raise SystemExit(f'게시물 주소를 못 읽음: {url}')
    return m.group(1)


def clean_caption(raw: str) -> tuple[str, list[str]]:
    """본문과 해시태그를 가른다. 해시태그는 검색어이므로 버리지 않고 따로 둔다."""
    tags: list[str] = []
    body: list[str] = []
    for line in raw.replace('\r', '').split('\n'):
        s = line.strip()
        if BOILERPLATE.match(s):
            continue
        found = HASHTAG.findall(s)
        for t in found:
            if t not in tags:
                tags.append(t)
        # "#태그 👈🏻 해시태그를 누르시면 …" 같은 안내 줄은 해시태그만 남기고 버린다
        if found and ('해시태그' in s or HASHTAG.sub('', s).strip(' 👈🏻💁🏻‍♀️💕🙋🏻‍♀️') == ''):
            continue
        body.append(s)
    text = '\n'.join(body).strip('\n')
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text, tags


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def save_photo(src: str, dest: Path) -> tuple[int, int]:
    if dest.exists():
        with Image.open(dest) as im:
            return im.size
    im = Image.open(io.BytesIO(fetch(src)))
    im = ImageOps.exif_transpose(im).convert('RGB')
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    return im.size


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, help='Aside 가 돌려준 JSON')
    ap.add_argument('--keep-missing', action='store_true',
                    help='입력에 없는 옛 게시물도 시드에 남긴다(기본은 입력으로 통째로 바꿈)')
    a = ap.parse_args()

    raw = json.loads(Path(a.src).read_text())
    old = json.loads(SEED.read_text()) if SEED.exists() else {'posts': []}
    old_by_id = {p['id']: p for p in old.get('posts', [])}

    posts = []
    for p in raw['posts']:
        sc = shortcode(p['url'])
        text, tags = clean_caption(p.get('caption') or '')
        images = []
        for i, u in enumerate(p.get('images') or [], start=1):
            dest = PHOTOS / f'{sc}-{i}.jpg'
            try:
                w, h = save_photo(u, dest)
            except Exception as e:  # 한 장 실패로 전체를 멈추지 않는다
                print(f'  ! {sc}-{i}: {e}', file=sys.stderr)
                continue
            images.append({'src': f'/instagram/{dest.name}', 'width': w, 'height': h})
        if not images:
            print(f'  ! {sc}: 사진이 하나도 없어 건너뜀', file=sys.stderr)
            continue
        posts.append({
            'id': sc,
            'url': f'https://www.instagram.com/p/{sc}/',
            'date': (p.get('date') or '')[:10],
            'text': text,
            'tags': tags,
            'images': images,
            'likes': p.get('likes') or 0,
            'pinned': bool(p.get('pinned')),
        })
        print(f'  {sc}  {posts[-1]["date"]}  사진 {len(images)}장')

    if a.keep_missing:
        seen = {p['id'] for p in posts}
        posts += [p for p in old_by_id.values() if p['id'] not in seen]

    # 고정 게시물이 위, 그다음 최신순 — 인스타 프로필과 같은 순서
    posts.sort(key=lambda p: (not p['pinned'], p['date']), reverse=False)
    posts.sort(key=lambda p: p['date'], reverse=True)
    posts.sort(key=lambda p: not p['pinned'])

    prof = raw.get('profile') or old.get('profile') or {}
    out = {
        '_comment': '인스타그램(@makeupforl) 게시물 사본. scripts/instagram/build.py 로 만든다 — 손으로 고치지 말 것.',
        'profile': {
            'username': prof.get('username', 'makeupforl'),
            'url': 'https://www.instagram.com/makeupforl/',
            'name': prof.get('full_name') or prof.get('name') or '메이크업포엘',
            'bio': prof.get('biography') or prof.get('bio') or '',
            'posts': prof.get('posts_count') or prof.get('posts') or len(posts),
            'followers': prof.get('followers') or 0,
        },
        'fetchedAt': raw.get('fetchedAt') or __import__('datetime').date.today().isoformat(),
        'posts': posts,
    }
    SEED.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(posts)}건 → {SEED.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
