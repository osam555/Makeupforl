import { describe, expect, it } from 'vitest'

import { LEAD_KEEP_DAYS, bookingRate, isLeadExpired, isLeadOverdue, leadAge, leadStatusLabel } from './consultLeads'

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
    expect(leadStatusLabel('booked')).toBe('예약함')
    expect(leadStatusLabel('done')).toBe('끝남')
    expect(leadStatusLabel('???')).toBe('???')
  })
  it('경과 시간', () => {
    const now = new Date('2026-10-31T12:00:00Z')
    expect(leadAge('2026-10-31T11:20:00Z', now)).toBe('40분 전')
    expect(leadAge('2026-10-31T07:00:00Z', now)).toBe('5시간 전')
    expect(leadAge('2026-10-28T12:00:00Z', now)).toBe('3일 전')
  })

  it('새 접수가 24시간 넘게 연락 없으면 늦음', () => {
    const now = new Date('2026-10-31T12:00:00Z')
    expect(isLeadOverdue({ status: 'new', createdAt: '2026-10-30T11:00:00Z' }, now)).toBe(true)
    expect(isLeadOverdue({ status: 'new', createdAt: '2026-10-31T01:00:00Z' }, now)).toBe(false)
    expect(isLeadOverdue({ status: 'called', createdAt: '2026-10-01T00:00:00Z' }, now)).toBe(false)
  })

  it('예약 전환율', () => {
    expect(bookingRate([])).toBeNull()
    expect(bookingRate([{ status: 'booked' }, { status: 'called' }, { status: 'new' }, { status: 'done' }])).toBe(25)
  })
})
