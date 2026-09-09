/**
 * 검색어 목표와 달성도.
 *
 * 순위는 밖에서 재야 아는 값이고, 매일 자동으로 가져올 방법도 마땅치 않다.
 * 그래서 두 가지를 나눈다.
 *
 *  - 우리가 아는 것: 이 말을 맡은 페이지가 있는가, 본문이 두꺼운가, 여러 페이지가
 *    같은 말을 다투고 있지는 않은가, 뒷받침하는 문항과 내부 링크가 있는가.
 *    이건 사이트를 읽어 그때그때 계산한다.
 *  - 밖에서 재야 아는 것: 네이버·구글에서 지금 몇 위인가. 이건 사람이 검색해 보고
 *    적는다. 적힌 날짜를 함께 남겨, 언제 잰 값인지 모르는 채로 믿지 않게 한다.
 *
 * 준비도(readiness)는 "우리가 할 수 있는 것을 얼마나 했는가" 다. 순위가 아니다.
 * 준비도가 100이어도 순위는 시간이 걸리고, 준비도가 낮으면 순위를 기대할 수 없다.
 */

export interface SeoTarget {
  /** 사람들이 실제로 치는 말 */
  term: string
  /** 월간 검색량 (네이버 검색광고 키워드도구, 잰 날짜는 VOLUME_MEASURED_AT) */
  volume: number
  /** 이 말을 맡기로 한 페이지 */
  owner: string
  /** 왜 이 페이지가 맡는가 */
  why: string
}

/** 검색량을 잰 날. 오래되면 다시 재야 한다 */
export const VOLUME_MEASURED_AT = '2026-09-08'

export const SEO_TARGETS: SeoTarget[] = [
  {
    term: '혼주한복',
    volume: 16450,
    owner: '/혼주한복',
    why: '한복은 문항 39개가 받치고 있어 가장 두껍다. 다투는 페이지도 없다',
  },
  {
    term: '혼주머리',
    volume: 5790,
    owner: '/혼주머리',
    why: '올림머리·헤어와 한 장에서 함께 받는다. 셋을 나누면 서로 잡아먹는다',
  },
  {
    term: '혼주메이크업',
    volume: 5060,
    owner: '/혼주메이크업',
    why: '가격과 예약이 있는 유일한 장. 이 말을 치는 사람은 맡길 곳을 찾는다',
  },
  {
    term: '혼주올림머리',
    volume: 1750,
    owner: '/혼주머리',
    why: '혼주머리와 같은 장. 제목에 함께 실었다',
  },
  {
    term: '혼주헤어',
    volume: 810,
    owner: '/혼주머리',
    why: '혼주머리와 같은 장',
  },
]

/** 사람이 적어 넣는 값 */
export interface SeoRank {
  /** 네이버에서 본 순위. 못 찾았으면 null */
  naver: number | null
  /** 구글에서 본 순위 */
  google: number | null
  /** 언제 재 봤나 (YYYY-MM-DD) */
  checkedAt: string
  /** 목표 순위 */
  goal: number
  note: string
}

export interface SeoConfig {
  ranks: Record<string, SeoRank>
  updatedAt?: string
}

export const DEFAULT_RANK: SeoRank = {
  naver: null,
  google: null,
  checkedAt: '',
  goal: 10,
  note: '',
}

/** 사이트에서 읽어 계산하는 값 */
export interface SeoFacts {
  /** 이 말을 맡은 페이지의 본문 길이 */
  ownerChars: number
  /** 제목에 이 말이 든 페이지 (둘 이상이면 서로 다툰다) */
  titlePages: string[]
  /** 제목에 이 말이 든 100문100답 문항 수 */
  questions: number
  /** 맡은 페이지로 들어오는 내부 링크 수 */
  inboundLinks: number
}

export interface Readiness {
  score: number
  /** 아직 못 채운 것 — 그대로 할 일 목록이 된다 */
  todo: string[]
}

/**
 * 준비도.
 *
 * 다섯 가지를 본다. 하나하나가 "이걸 안 하면 순위를 기대할 수 없다" 는 것들이다.
 * 점수를 올리려고 억지로 채우라는 뜻이 아니라, 빠진 것이 무엇인지 보이게 하는 표다.
 */
export function readiness(f: SeoFacts): Readiness {
  const todo: string[] = []
  let score = 0

  if (f.titlePages.length > 0) score += 30
  else todo.push('이 말을 제목에 가진 페이지가 없습니다 — 전용 페이지를 만드세요')

  if (f.ownerChars >= 1500) score += 20
  else if (f.ownerChars > 0)
    todo.push(`맡은 페이지 본문이 ${f.ownerChars}자입니다 — 1,500자 이상으로 채우세요`)

  if (f.titlePages.length <= 1) score += 20
  else
    todo.push(
      `${f.titlePages.length}개 페이지가 제목에 이 말을 갖고 있습니다 (${f.titlePages.join(', ')}) — 하나만 남기고 나머지는 역할을 가르세요`,
    )

  if (f.questions >= 3) score += 15
  else todo.push(`뒷받침하는 문항이 ${f.questions}개입니다 — 제목에 이 말이 든 문항을 3개 이상으로`)

  if (f.inboundLinks >= 3) score += 15
  else todo.push(`내부 링크가 ${f.inboundLinks}개입니다 — 다른 페이지에서 3곳 이상 걸어 주세요`)

  return { score, todo }
}

/** 순위가 적혀 있을 때의 달성도. 목표에 닿았으면 100 */
export function rankAchievement(r: SeoRank): number | null {
  const best = [r.naver, r.google].filter((x): x is number => typeof x === 'number')
  if (best.length === 0) return null
  const rank = Math.min(...best)
  if (rank <= r.goal) return 100
  // 목표의 열 배까지를 0~100 으로 편다. 100위 밖은 사실상 0이다
  const span = Math.max(1, r.goal * 10 - r.goal)
  return Math.max(0, Math.round((1 - (rank - r.goal) / span) * 100))
}

/** 잰 지 오래된 값인가 — 오래된 숫자를 지금 값처럼 보면 안 된다 */
export function isStale(checkedAt: string, days = 30): boolean {
  if (!checkedAt) return true
  const t = new Date(checkedAt).getTime()
  if (Number.isNaN(t)) return true
  return Date.now() - t > days * 86400_000
}
