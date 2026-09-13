#!/usr/bin/env python3
"""
업무일지(src/data/worklog.json) — 어드민 [업무일지] 탭이 읽는다.

    python3 scripts/worklog.py pending
        아직 일지에 없는 커밋을 보여 준다(최근 60개 안에서).
    python3 scripts/worklog.py add --title "…" --item "…" [--item "…"] --commits 86ddd93,bf081f8
    python3 scripts/worklog.py add --title "…" --item "…" --since-last
        --since-last 는 pending 에 뜨는 커밋을 전부 붙인다.
        날짜는 붙인 커밋 중 가장 최근 것의 날짜(--date 로 덮어씀).

커밋 제목은 여기서 git 으로 읽어 시드에 함께 적는다 — 화면이 GitHub 에 기대지 않게.
일지를 적는 커밋 자체("업무일지 …" 로 시작)는 pending 에서 뺀다. 안 그러면 일지를 적을
때마다 그 커밋이 다시 pending 에 떠서 끝이 없다.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / 'src' / 'data' / 'worklog.json'


def git(*args: str) -> str:
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout


def load() -> dict:
    return json.loads(SEED.read_text()) if SEED.exists() else {'entries': []}


def save(data: dict) -> None:
    data['entries'].sort(key=lambda e: e['date'], reverse=True)
    SEED.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def recent(n: int = 60) -> list[dict]:
    out = git('log', f'-{n}', '--format=%h%x09%ad%x09%s', '--date=short')
    rows = []
    for line in out.splitlines():
        sha, d, subject = line.split('\t', 2)
        rows.append({'sha': sha, 'date': d, 'subject': subject})
    return rows


def pending(data: dict) -> list[dict]:
    logged = {c['sha'][:7] for e in data['entries'] for c in e['commits']}
    # 일지를 시작한 날 이전 커밋은 보지 않는다 — 그 전 것까지 다 적을 생각은 없다
    start = min((e['date'] for e in data['entries']), default='0000-00-00')
    return [c for c in recent()
            if c['sha'] not in logged and c['date'] >= start and not re.match(r'^업무일지', c['subject'])]


def resolve(sha: str) -> dict:
    h, d, s = git('log', '-1', '--format=%h%x09%ad%x09%s', '--date=short', sha).strip().split('\t', 2)
    return {'sha': h, 'date': d, 'subject': s}


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('pending')
    a = sub.add_parser('add')
    a.add_argument('--title', required=True)
    a.add_argument('--item', action='append', default=[], help='한 일 한 줄. 여러 번')
    a.add_argument('--commits', default='', help='쉼표로 나눈 커밋')
    a.add_argument('--since-last', action='store_true')
    a.add_argument('--date')
    args = ap.parse_args()

    data = load()
    if args.cmd == 'pending':
        rows = pending(data)
        for c in rows:
            print(f"{c['sha']}  {c['date']}  {c['subject']}")
        print(f'— {len(rows)}건' if rows else '— 일지에 없는 커밋이 없다')
        return

    commits = [resolve(s.strip()) for s in args.commits.split(',') if s.strip()]
    if args.since_last:
        commits += [c for c in pending(data) if c['sha'] not in {x['sha'] for x in commits}]
    if not commits:
        raise SystemExit('붙일 커밋이 없다 — --commits 나 --since-last')
    when = args.date or max(c['date'] for c in commits)
    n = sum(1 for e in data['entries'] if e['date'] == when) + 1
    entry = {
        'id': f'{when}-{n}',
        'date': when,
        'title': args.title,
        'items': args.item,
        'commits': [{'sha': c['sha'], 'subject': c['subject']} for c in commits],
    }
    data['entries'].append(entry)
    save(data)
    print(f"{entry['id']}  {entry['title']}  커밋 {len(commits)}건")


if __name__ == '__main__':
    main()
