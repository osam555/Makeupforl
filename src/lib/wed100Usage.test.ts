import { describe, expect, it } from 'vitest'

import { activeWithin, usageLine } from './wed100Usage'

const now = new Date('2026-11-01T12:00:00Z')

describe('usageLine', () => {
  it('열람 기록이 없으면 아직 열람하지 않음', () => {
    expect(usageLine(undefined, now)).toBe('아직 열람하지 않음')
  })
  it('문항 수·접속일·마지막 시각을 보여 준다', () => {
    expect(
      usageLine({ lastAt: '2026-11-01T09:00:00Z', viewed: ['p1-01', 'p1-02'], days: ['2026-11-01'], opens: 5 }, now),
    ).toBe('2문항 열람 · 1일 접속 · 마지막 3시간 전')
  })
})

describe('activeWithin', () => {
  it('7일 안에 봤으면 활동 중', () => {
    expect(activeWithin({ lastAt: '2026-10-28T12:00:00Z' }, 7, now)).toBe(true)
    expect(activeWithin({ lastAt: '2026-10-20T12:00:00Z' }, 7, now)).toBe(false)
    expect(activeWithin(undefined, 7, now)).toBe(false)
  })
})
