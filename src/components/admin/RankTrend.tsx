'use client'

import { todayKST, type SeoSnapshot } from '@/lib/seoKeywords'

export type TrendWeeks = 1 | 2 | 4

/**
 * 검색어 하나의 순위 추세 — 네이버와 구글을 한 판에.
 *
 * 순위는 1위가 위다. 그래서 세로축을 뒤집어 그린다 — 선이 올라가면 좋아진 것.
 * 보통 그래프처럼 그리면 순위가 오를 때 선이 내려가서 매번 머릿속에서 뒤집어야 한다.
 *
 * 잰 날에만 점이 있다. 안 잰 날을 앞뒤 값으로 메우지 않는다 — 그러면 실제로 잰 날과
 * 지어낸 날을 구분할 수 없고, 매끄러워 보이는 만큼 덜 정직해진다. 가로축은 날짜에
 * 비례한다. 점 사이가 벌어져 있으면 그만큼 오래 안 잰 것이다.
 *
 * 못 찾음(null)은 맨 아래에 속 빈 점으로 둔다. 빼 버리면 "3페이지까지 봤는데
 * 없었다" 는 사실이 사라지고, 30위쯤으로 지어 넣으면 없는 숫자가 생긴다.
 *
 * 좌표는 퍼센트로 찍는다. viewBox 를 늘려 채우면 점이 타원이 되고 글자가 찌그러진다.
 * <path> 는 퍼센트를 못 받아 선분(<line>)으로 잇는다.
 */
export default function RankTrend({
  term,
  history,
  weeks,
  goal,
}: {
  term: string
  history: SeoSnapshot[]
  weeks: TrendWeeks
  goal: number
}) {
  const days = weeks * 7
  const today = todayKST()
  const start = shiftDate(today, -(days - 1))

  const pts = history
    .filter((s) => s.date >= start && s.date <= today)
    .filter((s) => term in (s.naver ?? {}) || term in (s.google ?? {}))
    .map((s) => ({
      date: s.date,
      naver: s.naver?.[term] ?? null,
      google: s.google?.[term] ?? null,
      x: 6 + (dayDiff(start, s.date) / Math.max(1, days - 1)) * 88,
    }))

  if (pts.length === 0) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-[var(--a-e8dfd7)] p-3 text-[0.6875rem] text-[var(--a-8a7a72)]">
        최근 {weeks}주 안에 잰 기록이 없습니다. 순위를 적고 저장하면 잰 날 자리에 점이 생깁니다.
      </p>
    )
  }

  /*
    세로 범위는 실제 값에 맞춘다. 늘 1~30위로 두면 2위와 5위 차이가 안 보이고,
    값에만 맞추면 목표선이 밖으로 나간다. 둘 다 들어오게 잡는다.
  */
  const seen = pts.flatMap((p) => [p.naver, p.google]).filter((v): v is number => v !== null)
  const yMax = Math.max(goal + 2, ...seen, 5)
  const TOP = 10
  const BOTTOM = 80
  const MISSING = 92
  const yOf = (rank: number | null) =>
    rank === null ? MISSING : TOP + ((rank - 1) / (yMax - 1)) * (BOTTOM - TOP)

  const series = [
    { key: 'naver' as const, label: '네이버', color: 'var(--a-3f6b57)' },
    { key: 'google' as const, label: '구글', color: 'var(--a-a63d5a)' },
  ]
  const last = pts[pts.length - 1]

  return (
    <div className="mt-3 rounded-lg border border-[var(--a-e8dfd7)] bg-white p-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-[var(--a-8a7a72)]">
        <span className="font-bold text-[var(--a-3a322e)]">순위 추세 · {weeks}주</span>
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}{' '}
            <b className="text-[var(--a-2e2724)]">
              {last[s.key] === null ? '못 찾음' : `${last[s.key]}위`}
            </b>
          </span>
        ))}
        <span className="ml-auto">
          {pts.length}회 잼 · 마지막 {last.date.slice(5)}
        </span>
      </div>

      <svg className="mt-1 h-28 w-full" role="img" aria-label={`${term} 순위 추세`}>
        {/* 목표선 — 이 아래로 내려오면(=위로 올라가면) 된 것 */}
        <line
          x1="6%"
          x2="94%"
          y1={`${yOf(goal)}%`}
          y2={`${yOf(goal)}%`}
          stroke="var(--a-d4c7be)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text x="94%" y={`${yOf(goal) - 3}%`} textAnchor="end" fontSize="9" fill="var(--a-8a7a72)">
          목표 {goal}위
        </text>
        <text x="0" y={`${TOP + 3}%`} fontSize="9" fill="var(--a-8a7a72)">
          1위
        </text>
        <text x="0" y={`${BOTTOM + 3}%`} fontSize="9" fill="var(--a-8a7a72)">
          {yMax}위
        </text>
        <text x="0" y={`${MISSING + 3}%`} fontSize="9" fill="var(--a-8a7a72)">
          없음
        </text>

        {series.map((s) => (
          <g key={s.key}>
            {pts.slice(1).map((p, i) => {
              const q = pts[i]
              const gap = p[s.key] === null || q[s.key] === null
              return (
                <line
                  key={p.date}
                  x1={`${q.x}%`}
                  y1={`${yOf(q[s.key])}%`}
                  x2={`${p.x}%`}
                  y2={`${yOf(p[s.key])}%`}
                  stroke={s.color}
                  strokeWidth="1.5"
                  // 못 찾음과 잇는 구간은 점선 — 값이 이어진 게 아니라 끊긴 것이다
                  strokeDasharray={gap ? '2 3' : undefined}
                  opacity={gap ? 0.6 : 1}
                />
              )
            })}
            {pts.map((p) => (
              <circle
                key={p.date}
                cx={`${p.x}%`}
                cy={`${yOf(p[s.key])}%`}
                r="3"
                fill={p[s.key] === null ? 'white' : s.color}
                stroke={s.color}
                strokeWidth="1.5"
              >
                <title>{`${p.date} · ${s.label} ${p[s.key] === null ? '못 찾음' : `${p[s.key]}위`}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>

      <div className="flex justify-between text-[0.625rem] text-[var(--a-8a7a72)]">
        <span>{start.slice(5)}</span>
        <span>{today.slice(5)}</span>
      </div>
    </div>
  )
}

/** YYYY-MM-DD 에 날을 더한다. 시간대 때문에 하루가 밀리지 않게 UTC 정오 기준으로 센다 */
function shiftDate(ymd: string, delta: number): string {
  const t = new Date(`${ymd}T12:00:00Z`)
  t.setUTCDate(t.getUTCDate() + delta)
  return t.toISOString().slice(0, 10)
}

function dayDiff(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86400_000,
  )
}
