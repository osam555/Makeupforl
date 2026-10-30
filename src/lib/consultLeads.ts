/**
 * 상담 신청(consult_leads) — 화면과 서버가 함께 보는 상수·순수 함수.
 *
 * 보관 기간은 동의 문구(Wed100ChatGuide)와 개인정보처리방침에 적힌 숫자와 같아야 한다.
 * 세 곳에 따로 적으면 한 곳만 바뀐다 — 여기 하나만 고친다.
 */
export const LEAD_KEEP_DAYS = 365

export type LeadStatus = 'new' | 'called' | 'done'

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

const LABEL: Record<string, string> = { new: '새 접수', called: '연락함', done: '끝남' }
export const leadStatusLabel = (s: string) => LABEL[s] ?? s

/** 보관 기간이 지났나. 날짜를 못 읽으면 지울 근거가 없으므로 false */
export function isLeadExpired(createdAt: string, now: Date = new Date()): boolean {
  const t = Date.parse(createdAt)
  if (Number.isNaN(t)) return false
  return now.getTime() - t > LEAD_KEEP_DAYS * 86_400_000
}
