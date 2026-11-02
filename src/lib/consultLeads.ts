/**
 * 상담 신청(consult_leads) — 화면과 서버가 함께 보는 상수·순수 함수.
 *
 * 보관 기간은 동의 문구(Wed100ChatGuide)와 개인정보처리방침에 적힌 숫자와 같아야 한다.
 * 세 곳에 따로 적으면 한 곳만 바뀐다 — 여기 하나만 고친다.
 */
export const LEAD_KEEP_DAYS = 365

/** booked = 상담 끝에 실제 예약까지 이어짐. 설문이 매출로 이어졌는지를 이 숫자로 본다 */
export type LeadStatus = 'new' | 'called' | 'booked' | 'done'

export interface ConsultLead {
  id: string
  name: string
  phone: string
  when: string
  who: string
  worry: string
  source: string
  status: LeadStatus
  createdAt: string
}

const LABEL: Record<string, string> = { new: '새 접수', called: '연락함', booked: '예약함', done: '끝남' }
export const leadStatusLabel = (s: string) => LABEL[s] ?? s

/** 보관 기간이 지났나. 날짜를 못 읽으면 지울 근거가 없으므로 false */
export function isLeadExpired(createdAt: string, now: Date = new Date()): boolean {
  const t = Date.parse(createdAt)
  if (Number.isNaN(t)) return false
  return now.getTime() - t > LEAD_KEEP_DAYS * 86_400_000
}

/**
 * 새 접수가 연락 없이 이만큼 지나면 늦었다고 표시한다.
 * 같은 날 전화하느냐가 예약률을 가장 크게 가른다 — 하루를 넘기면 다른 곳을 알아본다.
 */
export const LEAD_CALL_WITHIN_HOURS = 24

/** 접수 뒤 얼마나 지났나 — "40분 전" "5시간 전" "3일 전" */
export function leadAge(createdAt: string, now: Date = new Date()): string {
  const t = Date.parse(createdAt)
  if (Number.isNaN(t)) return ''
  const min = Math.max(0, Math.floor((now.getTime() - t) / 60_000))
  if (min < 60) return `${min}분 전`
  if (min < 60 * 24) return `${Math.floor(min / 60)}시간 전`
  return `${Math.floor(min / 1440)}일 전`
}

/** 새 접수인데 연락 기한을 넘겼나 */
export function isLeadOverdue(l: Pick<ConsultLead, 'status' | 'createdAt'>, now: Date = new Date()): boolean {
  const t = Date.parse(l.createdAt)
  return l.status === 'new' && !Number.isNaN(t) && now.getTime() - t > LEAD_CALL_WITHIN_HOURS * 3_600_000
}

/** 접수 중 예약까지 간 비율(%) — 0건이면 null */
export function bookingRate(leads: Pick<ConsultLead, 'status'>[]): number | null {
  if (leads.length === 0) return null
  return Math.round((leads.filter((l) => l.status === 'booked').length / leads.length) * 100)
}
