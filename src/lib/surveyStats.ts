/**
 * 100문100답 설문(원장님께 물어보기) 단계별 통계.
 *
 * 접수된 상담(consult_leads)만 보면 "연락처 칸까지 왔다가 그냥 간 분"이 안 보인다.
 * 어느 단계에서 가장 많이 빠지는지 알아야 문구를 고칠 곳을 고를 수 있다.
 *
 * /api/track 과 같은 원칙: 사람을 식별하지 않는다. 이름·전화 입력값은 보내지 않고,
 * 쿠키·IP·UA 도 남기지 않는다. 날짜별 문서 하나(survey_daily/{YYYY-MM-DD})에 증가값만 쌓는다.
 * 같은 탭에서 같은 단계는 한 번만 센다(sessionStorage).
 */
export const SURVEY_COLLECTION = 'survey_daily'

/** 단계 순서 — 화면 흐름과 같다 */
export const SURVEY_STEPS = [
  { key: 'seen', label: '설문을 봄' },
  { key: 'who', label: '첫 답 (누구신지)' },
  { key: 'worry', label: '걱정 고름' },
  { key: 'form', label: '연락 받기 누름' },
  { key: 'typing', label: '연락처 입력 시작' },
  { key: 'submit', label: '제출 완료' },
] as const

/** 단계 밖의 행동 — 이탈이 아니라 다른 길로 간 것 */
export const SURVEY_SIDE = [
  { key: 'free', label: '무료 문항 열기' },
  { key: 'buy', label: '이용권 단추' },
  { key: 'tel', label: '전화 걸기' },
] as const

export type SurveyEvent = (typeof SURVEY_STEPS)[number]['key'] | (typeof SURVEY_SIDE)[number]['key']
export const SURVEY_EVENTS: readonly string[] = [...SURVEY_STEPS, ...SURVEY_SIDE].map((s) => s.key)

/** 답 고름 값을 필드 이름으로 쓸 수 있게 */
export const choiceKey = (v: string) => v.replace(/[~*/[\].\s]/g, '_').slice(0, 40) || '_'

export type SurveyDay = Partial<Record<SurveyEvent, number>> & {
  whoChoice?: Record<string, number>
  worryChoice?: Record<string, number>
}

export interface FunnelRow {
  key: string
  label: string
  count: number
  /** 바로 앞 단계 대비 남은 비율(%) — 첫 단계는 null */
  keep: number | null
}

/** 여러 날을 더해 단계별 숫자와 남은 비율을 낸다 */
export function funnel(days: SurveyDay[]): { rows: FunnelRow[]; side: FunnelRow[]; abandoned: number } {
  const sum = (k: string) => days.reduce((a, d) => a + (Number((d as Record<string, unknown>)[k]) || 0), 0)
  let prev: number | null = null
  const rows = SURVEY_STEPS.map((s) => {
    const count = sum(s.key)
    const keep = prev === null ? null : prev ? Math.round((count / prev) * 100) : 0
    prev = count
    return { key: s.key, label: s.label, count, keep }
  })
  const side = SURVEY_SIDE.map((s) => ({ key: s.key, label: s.label, count: sum(s.key), keep: null }))
  // 연락 받기를 눌러 놓고 제출하지 않은 분 — 가장 아까운 숫자
  const abandoned = Math.max(0, sum('form') - sum('submit'))
  return { rows, side, abandoned }
}

/** 고른 답 합계 (많은 순) */
export function choices(days: SurveyDay[], field: 'whoChoice' | 'worryChoice'): [string, number][] {
  const m = new Map<string, number>()
  for (const d of days) for (const [k, v] of Object.entries(d[field] ?? {})) m.set(k, (m.get(k) ?? 0) + (Number(v) || 0))
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}
