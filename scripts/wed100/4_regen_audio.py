#!/usr/bin/env python3
"""본문이 바뀐 문항의 원장 답변 음성을 다시 만든다.

왜 필요한가
  관리자에서 본문을 고쳐도 음성은 그대로 남는다. 그렇게 쌓인 문항이 화면에는
  새 글이, 소리로는 옛 글이 나가는 상태가 된다. Firestore 의 updatedAt 과
  Storage 파일 시각을 대조하면 어떤 문항이 그런지 정확히 알 수 있다.

무엇을 다시 만드는가
  원장 답변(edge-tts SunHi)만 새로 만든다. 질문은 기존 음성에서 그대로 잘라
  재사용하므로 Typecast 사용량이 들지 않고 목소리도 완전히 같다.
  본문과 자막 큐가 어긋난 문항은 현재 본문을 문장 단위로 다시 쪼갠다.

  edge-tts 출력은 전부 24kHz·모노·48kbps 라 파일을 이어붙이기만 해도
  ffmpeg concat 과 결과가 같다(검증함). 다만 기존 음성에서 질문 구간을
  잘라낼 때는 ffmpeg 가 필요하다.

사용법
  python3 scripts/wed100/4_regen_audio.py --list          다시 만들 문항만 보여준다
  python3 scripts/wed100/4_regen_audio.py p5-13           한 건만
  python3 scripts/wed100/4_regen_audio.py --all           전부
  환경변수 WED100_ADMIN_PASSWORD 로 관리자 비밀번호를 넘긴다.
"""
import argparse
import asyncio
import base64
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request as ur
from datetime import datetime, timedelta

PROJECT = 'makeupforl'
FS = f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents'
API = os.environ.get('WED100_API', 'https://makeupforl.vercel.app/api/wed100/save')
PW = os.environ.get('WED100_ADMIN_PASSWORD', '')

VOICE = 'ko-KR-SunHiNeural'
RATE = '+25%'
PITCH = '-6Hz'
GAP = 0.28          # 문장 사이 간격(초) — 기존 음성과 같은 값
BITRATE = '48k'
SAMPLE_RATE = 24000


# ── Firestore 읽기 (공개 읽기라 자격증명이 필요 없다) ──────────────────
def _val(f):
    if not f:
        return None
    k, v = next(iter(f.items()))
    if k == 'arrayValue':
        return [_val(x) for x in v.get('values', [])]
    if k == 'mapValue':
        return {kk: _val(vv) for kk, vv in v.get('fields', {}).items()}
    if k == 'integerValue':
        return int(v)
    if k == 'doubleValue':
        return float(v)
    if k == 'booleanValue':
        return bool(v)
    return v


def _get(url):
    return json.load(ur.urlopen(ur.Request(url, headers={'User-Agent': 'regen'}), timeout=30))


def load_items():
    out, tok = [], None
    while True:
        u = f'{FS}/wed100_questions?pageSize=300' + (f'&pageToken={tok}' if tok else '')
        d = _get(u)
        for doc in d.get('documents', []):
            it = {k: _val(v) for k, v in doc['fields'].items()}
            it['slug'] = doc['name'].split('/')[-1]
            out.append(it)
        tok = d.get('nextPageToken')
        if not tok:
            return out


def audio_updated(url):
    try:
        return _get(url.split('?')[0]).get('updated')
    except Exception:
        return None


# ── 문장 쪼개기 — 관리자의 [문장 재분할] 과 같은 기준 ────────────────
def split_sentences(text):
    parts = re.split(r'(?<=[.!?。！？])\s+|\n+', text)
    return [p.strip() for p in parts if p.strip()]


def rebuild_cues(item):
    """본문을 문장 단위로 다시 쪼개 큐를 만든다. 영어 자막은 문장이 갈라지면
    짝을 못 찾으므로, 같은 자리에 있던 것만 옮겨 붙이고 나머지는 비운다."""
    old = {c.get('ko', '').strip(): c.get('en') for c in (item.get('cues') or [])}
    sents = [s for p in (item.get('answer') or []) for s in split_sentences(p)]
    return [{'i': i, 'ko': s, 'en': old.get(s)} for i, s in enumerate(sents)]


# ── 음성 만들기 ──────────────────────────────────────────────────────
def dur(path):
    o = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                        '-of', 'default=nw=1:nk=1', path], capture_output=True, text=True, check=True)
    return float(o.stdout.strip())


async def synth(text, path):
    import edge_tts
    await edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH).save(path)


def cut_question(src, end_sec, out):
    """기존 음성에서 질문 구간만 잘라 낸다. 목소리를 그대로 쓰려는 것이다."""
    subprocess.run(['ffmpeg', '-y', '-i', src, '-t', f'{end_sec:.3f}',
                    '-ar', str(SAMPLE_RATE), '-ac', '1', '-b:a', BITRATE, out],
                   capture_output=True, check=True)


async def build(item, tmp):
    slug = item['slug']
    cues = item['cues']

    # 1) 질문 — 기존 음성에서 잘라 쓴다. 없으면 질문 없이 답변만 만든다
    segs = []
    qa = item.get('questionAudio') or {}
    q_end = qa.get('end')
    if item.get('audio') and q_end:
        old = os.path.join(tmp, 'old.mp3')
        with ur.urlopen(item['audio'], timeout=60) as f, open(old, 'wb') as w:
            w.write(f.read())
        q = os.path.join(tmp, 'q.mp3')
        cut_question(old, float(q_end), q)
        segs.append(('q', -1, q, dur(q)))

    # 2) 답변 — 큐마다 따로 만들어야 자막 타임코드를 정확히 맞출 수 있다
    for i, c in enumerate(cues):
        p = os.path.join(tmp, f'a{i}.mp3')
        await synth(c['ko'], p)
        segs.append(('a', i, p, dur(p)))

    # 3) 사이 간격
    sil = os.path.join(tmp, 'sil.mp3')
    subprocess.run(['ffmpeg', '-y', '-f', 'lavfi', '-i',
                    f'anullsrc=r={SAMPLE_RATE}:cl=mono', '-t', str(GAP),
                    '-b:a', BITRATE, sil], capture_output=True, check=True)
    sd = dur(sil)

    # 4) 이어붙이며 타임코드 누적
    out = os.path.join(tmp, f'{slug}.mp3')
    order, t = [], 0.0
    for n, (kind, ci, p, d) in enumerate(segs):
        order.append(p)
        if kind == 'q':
            item['questionAudio'] = {'start': 0.0, 'end': round(d, 3)}
        else:
            cues[ci]['start'] = round(t, 3)
            cues[ci]['end'] = round(t + d, 3)
        t += d
        if n < len(segs) - 1:
            order.append(sil)
            t += sd
    with open(out, 'wb') as w:
        for p in order:
            with open(p, 'rb') as f:
                w.write(f.read())
    return out, round(dur(out), 3)


def push(slug, mp3, cues, duration, question_audio):
    body = json.dumps({
        'password': PW, 'action': 'audioUpload', 'slug': slug,
        'mp3Base64': base64.b64encode(open(mp3, 'rb').read()).decode(),
        'cues': cues, 'duration': duration, 'questionAudio': question_audio,
    }).encode()
    req = ur.Request(API, data=body, headers={'Content-Type': 'application/json'})
    return json.load(ur.urlopen(req, timeout=180))


# ── 진단 ────────────────────────────────────────────────────────────
def diagnose(items):
    rows = []
    for it in items:
        cue_txt = re.sub(r'\s+', '', ' '.join(c.get('ko', '') for c in (it.get('cues') or [])))
        ans_txt = re.sub(r'\s+', '', ' '.join(it.get('answer') or []))
        mism = cue_txt != ans_txt
        stale = False
        if it.get('audio') and it.get('updatedAt'):
            au = audio_updated(it['audio'])
            if au:
                t = datetime.fromisoformat(it['updatedAt'].replace('Z', '+00:00'))
                a = datetime.fromisoformat(au.replace('Z', '+00:00'))
                stale = (t - a) > timedelta(minutes=10)
        if mism or stale:
            rows.append({'slug': it['slug'], 'mismatch': mism, 'stale': stale,
                         'q': (it.get('question') or '')[:34]})
    return rows


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slugs', nargs='*')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--list', action='store_true')
    a = ap.parse_args()

    items = load_items()
    by = {i['slug']: i for i in items}
    print(f'문항 {len(items)}건 읽음')

    if a.list or not (a.slugs or a.all):
        rows = diagnose(items)
        print(f'\n다시 만들 문항 {len(rows)}건')
        for r in rows:
            tag = ('큐불일치 ' if r['mismatch'] else '') + ('음성구버전' if r['stale'] else '')
            print(f"  {r['slug']:10} {tag:18} {r['q']}")
        return

    if not PW:
        sys.exit('WED100_ADMIN_PASSWORD 가 필요합니다.')

    targets = a.slugs or [r['slug'] for r in diagnose(items)]
    print(f'\n대상 {len(targets)}건\n')
    ok = fail = 0
    for n, slug in enumerate(targets, 1):
        it = by.get(slug)
        if not it:
            print(f'  [{n}/{len(targets)}] {slug} — 없는 문항'); fail += 1; continue
        cue_txt = re.sub(r'\s+', '', ' '.join(c.get('ko', '') for c in (it.get('cues') or [])))
        ans_txt = re.sub(r'\s+', '', ' '.join(it.get('answer') or []))
        note = ''
        if cue_txt != ans_txt:
            it['cues'] = rebuild_cues(it)
            note = f" (큐 재분할 {len(it['cues'])}개)"
        try:
            with tempfile.TemporaryDirectory() as tmp:
                mp3, d = await build(it, tmp)
                res = push(slug, mp3, it['cues'], d, it.get('questionAudio'))
            print(f"  [{n}/{len(targets)}] {slug:10} {d:6.1f}초{note}  {'올림' if res.get('ok') else res}")
            ok += 1
        except Exception as e:
            print(f'  [{n}/{len(targets)}] {slug:10} 실패 — {str(e)[:70]}'); fail += 1
    print(f'\n완료 {ok} / 실패 {fail}')


if __name__ == '__main__':
    asyncio.run(main())
