# -*- coding: utf-8 -*-
"""md-honjoo 네이버 블로그 덤프 → 포스트 단위 JSONL

날짜줄(2023/08/25 14:44)을 앵커로 글을 분리한다.
헤더는 앵커 앞뒤에 흩어져 있다 — 레이아웃이 두 가지다.
  A) URL / ## **제목** / ## **카테고리** / 날짜
  B) ## **제목** / ## **카테고리** / 날짜 / URL
"""
import json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'md-honjoo'
OUT = ROOT / 'book' / 'src' / 'posts.jsonl'
EXCLUDE = {'블로그후기-1.md', '블로그후기-2.md', '블로그후기-3강사과정.md'}

DATE = re.compile(r'^\s*(20\d\d)[/.-](\d\d)[/.-](\d\d)\s+\d\d:\d\d\s*$')
HEAD = re.compile(r'^\s*##\s*\*\*(.+?)\*\*\s*$')
URL  = re.compile(r'https?://blog\.naver\.com/([\w_]+)/(\d+)')
PIC  = re.compile(r'\*\*==>\s*picture.*?<==\*\*')
PICTXT = re.compile(r'\*?\*?-{3,}\s*Start of picture text\s*-{3,}.*?-{3,}\s*End of picture text\s*-{3,}\*?\*?', re.S)
PAGE = re.compile(r'^\s*\d+\s*·\s*\S.*$', re.M)          # "12 · 메이크업포엘"
CARD = re.compile(r'blog\.naver\.com\s*$')                 # 네이버 관련글 카드 꼬리
BOLDONLY = re.compile(r'^\s*\*\*[^*]+\*\*\s*$')
JUNK = re.compile(r'^\s*(naver\.me|blog\.naver\.com|카톡\s*[:：].*|0\d[\d.\-\s]{7,})\s*$', re.M)


def strip_cards(text: str) -> str:
    """네이버 '관련 글' 카드 제거 — 썸네일 + 굵은 제목줄 + '... blog.naver.com' 요약줄"""
    lines = text.split('\n')
    drop = set()
    for i, l in enumerate(lines):
        if not CARD.search(l):
            continue
        drop.add(i)
        j, back = i - 1, 0
        while j >= 0 and back < 3:
            if not lines[j].strip():
                j -= 1
                continue
            if BOLDONLY.match(lines[j]) or PIC.search(lines[j]):
                drop.add(j)
                j -= 1
                back += 1
            else:
                break
    return '\n'.join(l for i, l in enumerate(lines) if i not in drop)


def clean(text: str) -> str:
    t = text.replace('<br>', '\n')
    t = PICTXT.sub('', t)
    t = strip_cards(t)
    t = PIC.sub('', t)
    t = PAGE.sub('', t)
    t = URL.sub('', t)
    t = JUNK.sub('', t)
    t = re.sub(r'^\s*#{1,6}\s*', '', t, flags=re.M)       # 헤딩 마커 제거
    t = re.sub(r'\*\*(.+?)\*\*', r'\1', t)                # 굵게 마커 제거
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\n\s*\n+', '\n', t)
    return '\n'.join(l.strip() for l in t.split('\n') if l.strip())


def parse(path: Path):
    lines = path.read_text(encoding='utf-8').split('\n')
    anchors = [i for i, l in enumerate(lines) if DATE.match(l)]
    posts = []
    for k, i in enumerate(anchors):
        # 앵커 앞 6줄에서 제목·카테고리(## **..**) 와 URL 을 찾는다
        heads, start = [], i
        j = i - 1
        while j >= 0 and i - j <= 6:
            if HEAD.match(lines[j]):
                heads.append(HEAD.match(lines[j]).group(1).strip())
                start = j
            elif URL.search(lines[j]):
                start = j
            elif lines[j].strip():
                break
            j -= 1
        heads.reverse()
        body_from = i + 1
        if not heads:
            # 레이아웃 C — URL / 날짜 / ## **제목** / ## **카테고리** / 본문
            j = i + 1
            while j < len(lines) and j - i <= 6 and len(heads) < 2:
                if HEAD.match(lines[j]):
                    heads.append(HEAD.match(lines[j]).group(1).strip())
                    body_from = j + 1
                elif lines[j].strip() and not URL.search(lines[j]):
                    break
                j += 1
        title = heads[0] if heads else ''
        cat = heads[1] if len(heads) > 1 else ''
        posts.append({'start': start, 'anchor': i, 'title': title, 'cat': cat,
                      'body_from': body_from})
    out = []
    for k, p in enumerate(posts):
        end = posts[k + 1]['start'] if k + 1 < len(posts) else len(lines)
        seg = '\n'.join(lines[p['start']:end])
        m = URL.search(seg)
        dm = DATE.match(lines[p['anchor']])
        body = clean('\n'.join(lines[p['body_from']:end]))
        # 본문 첫 줄이 제목 반복이면 제거
        bl = body.split('\n')
        if bl and p['title'] and bl[0].replace(' ', '') == p['title'].replace(' ', ''):
            body = '\n'.join(bl[1:])
        out.append({
            'file': unicodedata.normalize('NFC', path.name),
            'blog': m.group(1) if m else '',
            'postId': m.group(2) if m else '',
            'url': m.group(0) if m else '',
            'date': f"{dm.group(1)}-{dm.group(2)}-{dm.group(3)}",
            'category': p['cat'],
            'title': p['title'],
            'body': body,
            'chars': len(body),
        })
    return out


def main():
    files = sorted(f for f in SRC.glob('*.md')
                   if unicodedata.normalize('NFC', f.name) not in EXCLUDE)
    allp, seen = [], {}
    for f in files:
        for p in parse(f):
            key = p['postId'] or f"{p['file']}:{p['title']}:{p['date']}"
            if key in seen:                      # 중복 — 본문이 긴 쪽을 남긴다
                if p['chars'] > seen[key]['chars']:
                    seen[key].update(p)
                continue
            seen[key] = p
            allp.append(p)
    allp.sort(key=lambda x: (x['date'], x['postId']))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open('w', encoding='utf-8') as fh:
        for p in allp:
            fh.write(json.dumps(p, ensure_ascii=False) + '\n')

    import collections
    print(f'파일 {len(files)}개 → 포스트 {len(allp)}개')
    print(f"URL 확보 {sum(1 for p in allp if p['url'])} / 제목 확보 {sum(1 for p in allp if p['title'])}")
    print(f"본문 총 {sum(p['chars'] for p in allp):,}자 (평균 {sum(p['chars'] for p in allp)//len(allp):,}자)")
    thin = [p for p in allp if p['chars'] < 200]
    print(f'본문 200자 미만: {len(thin)}개')
    print('연도별:', dict(sorted(collections.Counter(p['date'][:4] for p in allp).items())))
    print('카테고리 상위:', collections.Counter(p['category'] for p in allp).most_common(8))
    print(f'→ {OUT}')


if __name__ == '__main__':
    main()
