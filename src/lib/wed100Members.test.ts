import { describe, expect, it } from 'vitest'

import { REGISTER_MONTHS, addMonths, mergeMembers, parseMemberInput } from './wed100Members'

describe('wed100Members', () => {
  it('기본 기간은 3개월 (이용권과 같음)', () => expect(REGISTER_MONTHS).toBe(3))

  it('개월 더하기 — 달 넘김', () => {
    expect(addMonths(6, '2026-10-31')).toBe('2027-05-01')
    expect(addMonths(6, '2026-11-15')).toBe('2027-05-15')
  })

  it('입력 정리 — 이메일 소문자, 전화 하이픈', () => {
    const r = parseMemberInput({ name: ' 김혼주 ', email: 'Kim@Gmail.com', phone: '01012345678', until: '2027-05-01' })
    expect(r).toEqual({ ok: true, name: '김혼주', email: 'kim@gmail.com', phone: '010-1234-5678', until: '2027-05-01' })
  })

  it('전화는 비어도 된다', () => {
    expect(parseMemberInput({ name: '김', email: 'a@gmail.com', phone: '', until: '2027-01-01' }).ok).toBe(true)
  })

  it('틀린 입력은 이유와 함께 거절', () => {
    expect(parseMemberInput({ name: '', email: 'a@gmail.com', until: '2027-01-01' }).ok).toBe(false)
    expect(parseMemberInput({ name: '김', email: 'nope', until: '2027-01-01' }).ok).toBe(false)
    expect(parseMemberInput({ name: '김', email: 'a@gmail.com', phone: '02-323-3321', until: '2027-01-01' }).ok).toBe(false)
    expect(parseMemberInput({ name: '김', email: 'a@gmail.com', until: '내년' }).ok).toBe(false)
  })

  it('합치기 — 새 명단이 옛 명단을 이긴다', () => {
    const m = mergeMembers(
      [{ email: 'a@gmail.com', until: '2026-01-01' }, { email: 'b@gmail.com', until: null }],
      [{ email: 'a@gmail.com', until: '2027-05-01' }],
    )
    expect(m).toEqual([{ email: 'a@gmail.com', until: '2027-05-01' }, { email: 'b@gmail.com', until: null }])
  })
})
