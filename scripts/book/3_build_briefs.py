# -*- coding: utf-8 -*-
"""문항별 집필 브리프 생성 — 기존 답변 + 근거 포스트의 관련 대목만 발췌

포스트 전문을 다 읽으면 분량이 감당이 안 된다. 문장 단위로 질의 적합도를 매겨
관련 대목만 추린다.
"""
import json, re, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POSTS = ROOT / 'book' / 'src' / 'posts.jsonl'
MAP = ROOT / 'book' / 'src' / 'mapping.json'
SEED = ROOT / 'src' / 'data' / 'wed100.json'
OUT = ROOT / 'book' / 'src' / 'briefs'

TOP_POSTS = 4          # 문항당 참고 포스트 수
PER_POST = 420         # 포스트당 발췌 상한(자)
NONHAN = re.compile(r'[^가-힣a-zA-Z0-9]+')
FLOOR = 1000


def toks(t):
    s = NONHAN.sub('', t)
    return set(s[i:i + 2] for i in range(len(s) - 1))


def excerpt(body, qt, cap=PER_POST):
    lines = [l for l in body.split('\n') if len(l) > 8]
    if not lines:
        return body[:cap]
    scored = []
    for i, l in enumerate(lines):
        lt = toks(l)
        scored.append((len(lt & qt) / (len(lt) ** 0.5 + 1), i))
    scored.sort(reverse=True)
    keep, total = set(), 0
    for sc, i in scored:
        if total >= cap:
            break
        if sc <= 0:
            break
        keep.add(i)
        total += len(lines[i])
    out, prev = [], -2
    for i in sorted(keep):
        if i - prev > 1:
            out.append('…')
        out.append(lines[i])
        prev = i
    return '\n'.join(out)


def main():
    posts = {p['postId']: p for p in (json.loads(l) for l in POSTS.open(encoding='utf-8'))}
    mapping = json.loads(MAP.read_text(encoding='utf-8'))
    items = json.loads(SEED.read_text(encoding='utf-8'))['items']
    OUT.mkdir(parents=True, exist_ok=True)

    total = 0
    for it in items:
        cur = '\n\n'.join(it['answer'])
        n = len(''.join(it['answer']))
        if n >= FLOOR:
            continue                       # 원문 유지 대상 — 브리프 불필요
        qt = toks(it['question'] + ' ' + ' '.join(it['keywords']) + ' ' + cur)
        cands = mapping[str(it['id'])]['candidates'][:TOP_POSTS]
        parts = [
            f"# [{it['id']}] PART {it['part']} · {it['partTitle']}",
            f"## 질문\n{it['question']}",
            f"## 현재 답변 ({n}자 · 목표 {FLOOR}자 이상 · +{FLOOR - n}자 필요)",
            cur,
            "## 근거 발췌 (메이크업포엘 블로그)",
        ]
        for c in cands:
            p = posts.get(c['postId'])
            if not p:
                continue
            ex = excerpt(p['body'], qt)
            if len(ex) < 120:
                continue
            parts.append(f"### [{c['date']}] {p['title']}\n{c['url']}\n\n{ex}")
        txt = '\n\n'.join(parts)
        (OUT / f"{it['id']}.md").write_text(txt, encoding='utf-8')
        total += len(txt)

    files = sorted(OUT.glob('*.md'))
    print(f'브리프 {len(files)}개 생성 (총 {total:,}자, 평균 {total // max(1,len(files)):,}자)')
    print(f'→ {OUT}')


if __name__ == '__main__':
    main()
