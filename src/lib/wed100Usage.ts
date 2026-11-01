import { leadAge } from '@/lib/consultLeads'

/**
 * 100문100답 이용권 회원의 열람 현황.
 *
 * 원장이 "산 분이 실제로 보고 있나"를 알아야 연장 안내·후기 부탁을 할 때를 고를 수 있다.
 * 잠긴 문항 본문은 /api/wed100/answer 로만 내려가므로, 거기서 성공한 순간만 센다 —
 * 페이지 방문(/api/track)은 사람을 식별하지 않는 익명 통계라 여기에 섞지 않는다.
 *
 * 회원 문서(wed100_members)에 같이 쓰지 않고 따로 둔다: 옛 공개 명단에서 온 회원은
 * 회원 문서가 없고, 등록 저장(set)이 열람 기록을 덮어쓰지 않게 하려는 것이다.
 * 문서 ID 는 회원과 같은 소문자 이메일.
 */
export const USAGE_COLLECTION = 'wed100_usage'

export interface Wed100Usage {
  email: string
  /** 마지막으로 본문을 받은 시각 (ISO) */
  lastAt: string
  /** 본문을 받은 횟수 — 같은 문항을 다시 열어도 센다 */
  opens: number
  /** 한 번이라도 연 문항 slug */
  viewed: string[]
  /** 연 날 (KST YYYY-MM-DD) */
  days: string[]
  /** 본문이 화면에 떠 있던 시간 합계(초) — 2026-11-01 부터 센다 */
  seconds?: number
}

/** 한 번 보고에 더할 수 있는 최대 초 — 창을 켜 둔 채 자리를 비운 경우를 자른다 */
export const MAX_REPORT_SECONDS = 30 * 60

/** 보고된 초를 믿을 만한 범위로 자른다. 쓸 수 없으면 0 */
export function clampSeconds(v: unknown): number {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(n, MAX_REPORT_SECONDS)
}

/** 초를 "1시간 5분" / "12분" / "1분 미만" 으로 */
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  if (m < 1) return '1분 미만'
  const h = Math.floor(m / 60)
  return h ? `${h}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`
}

/** 목록 한 줄 요약 — 아직 안 열었으면 그렇게 말한다 */
export function usageLine(u: Partial<Wed100Usage> | undefined, now = new Date()): string {
  if (!u?.lastAt) return '아직 열람하지 않음'
  const viewed = u.viewed?.length ?? 0
  const days = u.days?.length ?? 0
  const time = u.seconds ? ` · 총 ${formatDuration(u.seconds)}` : ''
  return `${viewed}문항 열람${time} · ${days}일 접속 · 마지막 ${leadAge(u.lastAt, now)}`
}

/** 최근 n일 안에 본 적이 있나 */
export function activeWithin(u: Partial<Wed100Usage> | undefined, days: number, now = new Date()): boolean {
  if (!u?.lastAt) return false
  return now.getTime() - new Date(u.lastAt).getTime() <= days * 86400_000
}
