'use client'

import { useMemo, useState } from 'react'

import { Panel, Stat } from '@/components/admin/AdminUI'
import {
  GRAIN_LABEL,
  SOURCE_COLOR,
  SOURCE_COLOR_OTHER,
  SOURCE_LABEL,
  avgDwell,
  fmtDwell,
  groupDays,
  sum,
  unkey,
  type DailyStat,
  type Grain,
} from '@/lib/analytics'

/** 단위마다 몇 칸을 보여 주나 — 일간 30일, 주간 12주, 월간 12달 */
const SPAN: Record<Grain, number> = { day: 30, week: 12, month: 12 }

/** 열로 세울 출처 수. 넘치는 것은 '그 밖에' 로 뭉친다 — 표가 옆으로 새지 않게 */
const MAX_COLS = 6

/** 방문 기록을 남기기 시작한 날. 그 전은 0 이 아니라 "없음" 이다 */
const SINCE = '2026-09-09'

/**
 * 방문 통계 — 기간 × 출처.
 *
 * 한 화면에서 일·주·월을 오간다. 하루 단위는 흔들림이 커서 "왜 뛰었나" 를 짚을 때
 * 쓰고, 주·월은 추세를 볼 때 쓴다. 표의 행마다 막대를 같이 그려 출처 비중이
 * 숫자를 읽기 전에 보이게 한다 — 색은 표 머리와 막대가 같은 것을 쓴다.
 *
 * 열 수를 제한하는 것은 휴대전화 때문이다. 출처가 열 종류를 넘으면 표가 화면 밖으로
 * 나가고, 사실 여섯 번째부터는 한두 건이라 따로 볼 값이 아니다.
 */
export default function VisitsView({ days }: { days: DailyStat[] }) {
  const [grain, setGrain] = useState<Grain>('day')

  const rows = useMemo(() => groupDays(days, grain).slice(-SPAN[grain]), [days, grain])
  const total = useMemo(() => sum(rows), [rows])

  /* 열: 기간 전체 합이 큰 출처부터 */
  const cols = useMemo(
    () =>
      Object.entries(total.sources)
        .sort((x, y) => y[1] - x[1])
        .slice(0, MAX_COLS)
        .map(([k]) => k),
    [total],
  )
  const other = (d: { sources: Record<string, number> }) =>
    Object.entries(d.sources ?? {}).reduce((n, [k, v]) => (cols.includes(k) ? n : n + v), 0)
  const hasOther = rows.some((d) => other(d) > 0)

  const maxVisits = Math.max(1, ...rows.map((d) => d.visits))
  const label = (k: string) => SOURCE_LABEL[k] ?? unkey(k)
  const color = (k: string) => SOURCE_COLOR[k] ?? SOURCE_COLOR_OTHER

  /* 지난 같은 기간과 견준다 — 열두 달 중 앞 절반은 대개 비어 있어, 비면 표시하지 않는다 */
  const half = Math.floor(rows.length / 2)
  const recent = sum(rows.slice(-half))
  const before = sum(rows.slice(-half * 2, -half))
  const delta = (a: number, b: number) => (b === 0 ? null : Math.round(((a - b) / b) * 100))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(GRAIN_LABEL) as Grain[]).map((g) => (
          <button
            key={g}
            onClick={() => setGrain(g)}
            className={[
              'rounded-full border px-3 py-1.5 text-xs font-bold',
              grain === g
                ? 'border-[var(--a-2e2724)] bg-[var(--a-2e2724)] text-white'
                : 'border-[var(--a-d4c7be)] bg-white text-[var(--a-6b5d57)]',
            ].join(' ')}
          >
            {GRAIN_LABEL[g]}
          </button>
        ))}
        <span className="text-[0.6875rem] text-[var(--a-8a7a72)]">
          {grain === 'day' ? '최근 30일' : grain === 'week' ? '최근 12주 · 월요일 시작' : '최근 12달'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <Stat
          label="방문"
          value={total.visits.toLocaleString()}
          delta={delta(recent.visits, before.visits)}
          hint={`뒤 절반 ${recent.visits} · 앞 절반 ${before.visits}`}
        />
        <Stat label="조회" value={total.views.toLocaleString()} delta={delta(recent.views, before.views)} />
        <Stat
          label="평균 체류"
          value={fmtDwell(avgDwell(total.dwellMs, total.dwellCount))}
          hint={`${total.dwellCount.toLocaleString()}회 측정`}
        />
        <Stat
          label="가장 큰 출처"
          value={cols[0] ? label(cols[0]) : '—'}
          hint={cols[0] ? `${total.sources[cols[0]]}회 · ${Math.round((total.sources[cols[0]] / Math.max(1, total.visits)) * 100)}%` : undefined}
        />
      </div>

      <Panel title={`${GRAIN_LABEL[grain]} 출처별 방문`} hint="첫 방문 한 번만 셉니다. 같은 창에서 여러 쪽을 봐도 방문은 하나">
        {/* 색 설명 — 표 머리에도 색점이 있지만 좁은 화면에서는 머리가 가로로 밀려 안 보인다 */}
        <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-[var(--a-6b5d57)]">
          {cols.map((k) => (
            <span key={k} className="inline-flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-full" style={{ background: color(k) }} />
              {label(k)}
            </span>
          ))}
          {hasOther && (
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-full" style={{ background: SOURCE_COLOR_OTHER }} />
              그 밖에
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-[0.6875rem] text-[var(--a-8a7a72)]">
                <th className="py-1.5 text-left font-bold">{grain === 'month' ? '달' : grain === 'week' ? '주 (월요일)' : '날짜'}</th>
                <th className="w-[38%] min-w-[120px] py-1.5 text-left font-bold">비중</th>
                <th className="py-1.5 pl-2 text-right font-bold">방문</th>
                <th className="py-1.5 pl-2 text-right font-bold">조회</th>
                {cols.map((k) => (
                  <th key={k} className="py-1.5 pl-2 text-right font-bold" title={label(k)}>
                    <i className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: color(k) }} />
                    {shortLabel(k)}
                  </th>
                ))}
                {hasOther && <th className="py-1.5 pl-2 text-right font-bold">그 밖에</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const noData = grain === 'day' && d.date < SINCE
                return (
                  <tr key={d.date} className="border-t border-[var(--a-efe7df)] text-[var(--a-3a322e)]">
                    <td className="py-1.5 whitespace-nowrap">{fmtPeriod(d.date, grain)}</td>
                    <td className="py-1.5 pr-2">
                      {noData ? (
                        <span className="text-[0.625rem] text-[var(--a-9a8b84)]">기록 전</span>
                      ) : (
                        <div
                          className="flex h-3 overflow-hidden rounded-sm bg-[var(--a-efe7df)]"
                          style={{ width: `${Math.max(2, (d.visits / maxVisits) * 100)}%` }}
                          title={`${fmtPeriod(d.date, grain)} · 방문 ${d.visits}`}
                        >
                          {cols.map((k) => {
                            const v = d.sources?.[k] ?? 0
                            return v ? (
                              <div
                                key={k}
                                style={{ width: `${(v / Math.max(1, d.visits)) * 100}%`, background: color(k) }}
                                title={`${label(k)} ${v}`}
                              />
                            ) : null
                          })}
                          {other(d) > 0 && (
                            <div
                              style={{ width: `${(other(d) / Math.max(1, d.visits)) * 100}%`, background: SOURCE_COLOR_OTHER }}
                              title={`그 밖에 ${other(d)}`}
                            />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 pl-2 text-right font-bold">{d.visits || '·'}</td>
                    <td className="py-1.5 pl-2 text-right">{d.views || '·'}</td>
                    {cols.map((k) => (
                      <td key={k} className="py-1.5 pl-2 text-right">
                        {d.sources?.[k] ?? '·'}
                      </td>
                    ))}
                    {hasOther && <td className="py-1.5 pl-2 text-right">{other(d) || '·'}</td>}
                  </tr>
                )
              })}
              <tr className="border-t-2 border-[var(--a-d4c7be)] font-bold text-[var(--a-2e2724)]">
                <td className="py-1.5">합계</td>
                <td />
                <td className="py-1.5 pl-2 text-right">{total.visits}</td>
                <td className="py-1.5 pl-2 text-right">{total.views}</td>
                {cols.map((k) => (
                  <td key={k} className="py-1.5 pl-2 text-right">
                    {total.sources[k] ?? 0}
                  </td>
                ))}
                {hasOther && <td className="py-1.5 pl-2 text-right">{other(total)}</td>}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[0.6875rem] leading-relaxed text-[var(--a-8a7a72)]">
          {SINCE} 부터 기록했습니다. 네이버를 모바일·PC·플레이스·블로그로 나눈 것은 2026-09-11 저녁부터라
          그 전 네이버는 &lsquo;네이버 (기타)&rsquo; 로 남습니다. Vercel 통계의 &lsquo;방문자&rsquo; 는
          하루 안의 같은 사람을 하나로 세고 여기의 &lsquo;방문&rsquo; 은 창을 새로 열 때마다 하나라 조금 다르게 나옵니다.
          사람을 식별하지 않습니다 — 쿠키·IP·기기 정보를 저장하지 않고 관리자 화면은 세지 않습니다.
        </p>
      </Panel>

      <Panel title="어느 페이지로 들어왔나" hint="출처별 첫 페이지 — 2026-09-11 저녁부터">
        <Landings landings={total.landings} cols={cols} label={label} color={color} />
      </Panel>
    </div>
  )
}

/** 열 머리에 들어갈 짧은 이름 — '네이버 모바일 검색' 을 그대로 두면 열이 넓어진다 */
function shortLabel(k: string): string {
  const short: Record<string, string> = {
    'naver-m': 'N 모바일',
    'naver-pc': 'N PC',
    'naver-place': 'N 플레이스',
    'naver-blog': 'N 블로그',
    'naver-cafe': 'N 카페',
    naver: 'N 기타',
    google: '구글',
    direct: '직접',
    youtube: '유튜브',
    sns: 'SNS',
    daum: '다음',
    internal: '내부',
  }
  return short[k] ?? unkey(k).slice(0, 10)
}

function fmtPeriod(date: string, grain: Grain): string {
  if (grain === 'month') return `${Number(date.slice(5, 7))}월 (${date.slice(2, 4)})`
  if (grain === 'week') return `${date.slice(5)}~`
  return date.slice(5)
}

function Landings({
  landings,
  cols,
  label,
  color,
}: {
  landings: Record<string, number>
  cols: string[]
  label: (k: string) => string
  color: (k: string) => string
}) {
  const bySource: Record<string, [string, number][]> = {}
  for (const [k, n] of Object.entries(landings)) {
    const i = k.indexOf('__')
    if (i < 0) continue
    ;(bySource[k.slice(0, i)] ??= []).push([k.slice(i + 2), n])
  }
  const shown = cols.filter((k) => bySource[k]?.length)
  if (shown.length === 0) {
    return <p className="py-4 text-center text-xs text-[var(--a-9a8b84)]">아직 기록이 없습니다</p>
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((k) => (
        <div key={k} className="min-w-0">
          <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--a-3a322e)]">
            <i className="inline-block h-2 w-2 rounded-full" style={{ background: color(k) }} />
            {label(k)}
          </p>
          <ul className="space-y-1">
            {bySource[k]
              .sort((x, y) => y[1] - x[1])
              .slice(0, 5)
              .map(([p, n]) => (
                <li key={p} className="flex min-w-0 gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-[var(--a-3a322e)]">{decodePath(unkey(p))}</span>
                  <b className="shrink-0 tabular-nums text-[var(--a-2e2724)]">{n}</b>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function decodePath(p: string): string {
  try {
    return decodeURIComponent(p)
  } catch {
    return p
  }
}
