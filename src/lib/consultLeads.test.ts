import { describe, expect, it } from 'vitest'

import { LEAD_KEEP_DAYS, isLeadExpired, leadStatusLabel } from './consultLeads'

describe('consultLeads', () => {
  it('보관 기간은 365일', () => expect(LEAD_KEEP_DAYS).toBe(365))

  it('접수 후 365일이 지나면 만료', () => {
    const now = new Date('2027-11-01T00:00:00+09:00')
    expect(isLeadExpired('2026-10-30T00:00:00.000Z', now)).toBe(true)
    expect(isLeadExpired('2027-06-01T00:00:00.000Z', now)).toBe(false)
  })

  it('날짜를 못 읽으면 만료로 보지 않는다 — 지울 근거가 없다', () => {
    expect(isLeadExpired('엉터리', new Date())).toBe(false)
  })

  it('상태 이름', () => {
    expect(leadStatusLabel('new')).toBe('새 접수')
    expect(leadStatusLabel('called')).toBe('연락함')
    expect(leadStatusLabel('done')).toBe('끝남')
    expect(leadStatusLabel('???')).toBe('???')
  })
})
