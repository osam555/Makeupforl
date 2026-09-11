/**
 * 방문 기록 읽기와 계산 (순수 함수 — 화면에서도 쓴다).
 */
export interface DailyStat {
  date: string
  visits: number
  views: number
  dwellMs: number
  dwellCount: number
  pages: Record<string, number>
  pageDwellMs: Record<string, number>
  pageDwellCount: Record<string, number>
  sources: Record<string, number>
  /** 출처별 들어온 페이지 — "출처__페이지" 열쇠. 2026-09-11 저녁부터 쌓인다 */
  landings: Record<string, number>
}

export const EMPTY_DAY: Omit<DailyStat, 'date'> = {
  visits: 0,
  views: 0,
  dwellMs: 0,
  dwellCount: 0,
  pages: {},
  pageDwellMs: {},
  pageDwellCount: {},
  sources: {},
  landings: {},
}

/** 저장할 때 / 를 _ 로 바꿨으므로 보여 줄 때 되돌린다 */
export const unkey = (k: string) => (k === '_' ? '/' : k.replace(/_/g, '/'))

export function sum(days: DailyStat[]) {
  const t = { visits: 0, views: 0, dwellMs: 0, dwellCount: 0 }
  const pages: Record<string, number> = {}
  const pageDwellMs: Record<string, number> = {}
  const pageDwellCount: Record<string, number> = {}
  const sources: Record<string, number> = {}
  const landings: Record<string, number> = {}
  for (const d of days) {
    t.visits += d.visits
    t.views += d.views
    t.dwellMs += d.dwellMs
    t.dwellCount += d.dwellCount
    for (const [k, v] of Object.entries(d.pages ?? {})) pages[k] = (pages[k] ?? 0) + v
    for (const [k, v] of Object.entries(d.pageDwellMs ?? {})) pageDwellMs[k] = (pageDwellMs[k] ?? 0) + v
    for (const [k, v] of Object.entries(d.pageDwellCount ?? {}))
      pageDwellCount[k] = (pageDwellCount[k] ?? 0) + v
    for (const [k, v] of Object.entries(d.sources ?? {})) sources[k] = (sources[k] ?? 0) + v
    for (const [k, v] of Object.entries(d.landings ?? {})) landings[k] = (landings[k] ?? 0) + v
  }
  return { ...t, pages, pageDwellMs, pageDwellCount, sources, landings }
}

/** 평균 체류 시간. 잰 횟수가 없으면 0 이 아니라 "모름" 이다 */
export function avgDwell(ms: number, count: number): number | null {
  return count > 0 ? Math.round(ms / count / 1000) : null
}

export function fmtDwell(sec: number | null): string {
  if (sec === null) return '—'
  if (sec < 60) return `${sec}초`
  return `${Math.floor(sec / 60)}분 ${sec % 60}초`
}

/** 최근 n일의 날짜 목록 (한국 시각, 오래된 것부터) */
export function recentDays(n: number): string[] {
  const out: string[] = []
  const now = Date.now()
  for (let i = n - 1; i >= 0; i--) {
    out.push(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(now - i * 86400_000)),
    )
  }
  return out
}

export const SOURCE_LABEL: Record<string, string> = {
  direct: '직접 방문',
  naver: '네이버 (기타)',
  'naver-m': '네이버 모바일 검색',
  'naver-pc': '네이버 PC 검색',
  'naver-place': '네이버 플레이스',
  'naver-blog': '네이버 블로그',
  'naver-cafe': '네이버 카페',
  google: '구글',
  daum: '다음·카카오',
  sns: '인스타·페이스북',
  youtube: '유튜브',
  internal: '사이트 내부',
}

/** 기간 단위 — 일간은 날짜, 주간은 월요일 날짜, 월간은 YYYY-MM */
export type Grain = 'day' | 'week' | 'month'

export const GRAIN_LABEL: Record<Grain, string> = { day: '일간', week: '주간', month: '월간' }

/**
 * 날짜별 기록을 주·월로 묶는다.
 *
 * 주는 월요일에 시작한다(한국 달력). 문서 이름이 YYYY-MM-DD 라 UTC 정오로 읽어
 * 요일을 구하면 시간대 때문에 하루가 밀리지 않는다.
 * 묶은 결과도 DailyStat 모양 그대로다 — 화면이 일·주·월을 같은 코드로 그린다.
 * date 칸에는 묶음의 첫날(주) 또는 YYYY-MM(월)이 들어간다.
 */
export function groupDays(days: DailyStat[], grain: Grain): DailyStat[] {
  if (grain === 'day') return days
  const keyOf = (date: string) => {
    if (grain === 'month') return date.slice(0, 7)
    const t = new Date(`${date}T12:00:00Z`)
    const dow = (t.getUTCDay() + 6) % 7 // 월=0
    t.setUTCDate(t.getUTCDate() - dow)
    return t.toISOString().slice(0, 10)
  }
  const buckets = new Map<string, DailyStat[]>()
  for (const d of days) {
    const k = keyOf(d.date)
    ;(buckets.get(k) ?? buckets.set(k, []).get(k)!).push(d)
  }
  return [...buckets.entries()].map(([date, rows]) => ({ date, ...sum(rows) }))
}

/**
 * 출처 색. 네이버 계열은 초록, 구글은 장미, 직접은 회색 — 표와 막대가 같은 색을 쓴다.
 * 목록에 없는 출처(다른 사이트)는 갈색 한 가지로 뭉친다.
 */
export const SOURCE_COLOR: Record<string, string> = {
  'naver-m': '#2DB400',
  'naver-pc': '#1E8A00',
  'naver-place': '#59C6A0',
  'naver-blog': '#9BD27A',
  'naver-cafe': '#C4E3A4',
  naver: '#7FBF5F',
  google: '#A63D5A',
  direct: '#B8ADA5',
  youtube: '#E0483B',
  sns: '#8E5BA6',
  daum: '#3D6BD8',
  internal: '#DDD3CB',
}
export const SOURCE_COLOR_OTHER = '#C8A27A'
