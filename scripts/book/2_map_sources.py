# -*- coding: utf-8 -*-
"""100문100답 각 문항 ↔ 블로그 포스트 매핑 (BM25, 한글 문자 bigram)

형태소 분석기 없이 한국어를 다루기 위해 공백 제거 후 문자 bigram 을 토큰으로 쓴다.
제목은 3배, 카테고리 '혼주메이크업' 은 소폭 가산.
"""
import json, math, re, csv, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POSTS = ROOT / 'book' / 'src' / 'posts.jsonl'
SEED = ROOT / 'src' / 'data' / 'wed100.json'
OUT_CSV = ROOT / 'book' / 'src' / 'mapping.csv'
OUT_JSON = ROOT / 'book' / 'src' / 'mapping.json'
TOPN = 12

NONHAN = re.compile(r'[^가-힣a-zA-Z0-9]+')


def toks(text: str) -> list:
    s = NONHAN.sub('', text)
    return [s[i:i + 2] for i in range(len(s) - 1)]


def main():
    posts = [json.loads(l) for l in POSTS.open(encoding='utf-8')]
    seed = json.loads(SEED.read_text(encoding='utf-8'))
    items = seed['items']

    docs = []
    for p in posts:
        t = toks(p['title']) * 3 + toks(p['body'])
        docs.append(t)
    N = len(docs)
    avgdl = sum(len(d) for d in docs) / N

    df = collections.Counter()
    tfs = []
    for d in docs:
        c = collections.Counter(d)
        tfs.append(c)
        df.update(c.keys())
    idf = {t: math.log(1 + (N - n + 0.5) / (n + 0.5)) for t, n in df.items()}

    inv = collections.defaultdict(list)      # 토큰 → [(docid, tf)]
    for i, c in enumerate(tfs):
        for t, f in c.items():
            inv[t].append((i, f))

    k1, b = 1.5, 0.75
    dl = [len(d) for d in docs]

    mapping, rows = {}, []
    for it in items:
        q = collections.Counter(
            toks(it['question']) * 3
            + toks(' '.join(it['keywords'])) * 3
            + toks(' '.join(it['answer']))
        )
        score = collections.defaultdict(float)
        for t, qf in q.items():
            if t not in inv:
                continue
            w = idf[t] * min(qf, 5)
            for i, f in inv[t]:
                score[i] += w * (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl[i] / avgdl))
        for i in score:
            if posts[i]['category'] == '혼주메이크업':
                score[i] *= 1.15
            if posts[i]['chars'] < 400:
                score[i] *= 0.5
        top = sorted(score.items(), key=lambda z: -z[1])[:TOPN]
        cands = []
        for rank, (i, sc) in enumerate(top, 1):
            p = posts[i]
            cands.append({'rank': rank, 'score': round(sc, 1), 'postId': p['postId'],
                          'date': p['date'], 'category': p['category'],
                          'title': p['title'], 'url': p['url'], 'chars': p['chars']})
            rows.append({'itemId': it['id'], 'part': it['part'], 'n': it['n'],
                         'question': it['question'], 'rank': rank, 'score': round(sc, 1),
                         'date': p['date'], 'category': p['category'],
                         'postTitle': p['title'], 'chars': p['chars'], 'url': p['url']})
        mapping[str(it['id'])] = {'question': it['question'], 'part': it['part'],
                                  'candidates': cands}

    OUT_JSON.write_text(json.dumps(mapping, ensure_ascii=False, indent=1), encoding='utf-8')
    with OUT_CSV.open('w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    used = {c['postId'] for v in mapping.values() for c in v['candidates']}
    print(f'문항 {len(items)}개 × 상위 {TOPN}편 = {len(rows)}행')
    print(f'동원된 고유 포스트: {len(used)} / {N}편')
    cov = collections.Counter()
    for v in mapping.values():
        cov[v['part']] += sum(c['chars'] for c in v['candidates'])
    print('파트별 후보 본문 총량:', {k: f'{v:,}' for k, v in sorted(cov.items())})
    print(f'→ {OUT_CSV}\n→ {OUT_JSON}')


if __name__ == '__main__':
    main()
