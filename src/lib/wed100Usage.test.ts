import { describe, expect, it } from 'vitest'

import { activeWithin, clampSeconds, formatDuration, usageLine, usageStats } from './wed100Usage'

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

describe('열람 시간', () => {
  it('보고된 초를 0~30분으로 자른다', () => {
    expect(clampSeconds(90)).toBe(90)
    expect(clampSeconds(99999)).toBe(1800)
    expect(clampSeconds(-3)).toBe(0)
    expect(clampSeconds('x')).toBe(0)
  })
  it('시간을 읽기 쉽게 적는다', () => {
    expect(formatDuration(30)).toBe('1분 미만')
    expect(formatDuration(720)).toBe('12분')
    expect(formatDuration(3900)).toBe('1시간 5분')
    expect(formatDuration(3600)).toBe('1시간')
  })
  it('요약 줄에 총 열람 시간이 들어간다', () => {
    expect(
      usageLine({ lastAt: '2026-11-01T09:00:00Z', viewed: ['p1-01'], days: ['2026-11-01'], seconds: 720 }, now),
    ).toBe('1문항 열람 · 총 12분 · 1일 접속 · 마지막 3시간 전')
  })
})

describe('usageStats', () => {
  it('카드 칸: 문항·시간·접속일·연 횟수·마지막 시각', () => {
    const cells = usageStats({ email: 'a@gmail.com', lastAt: '2026-11-01T12:40:00.000Z', opens: 7, viewed: ['p1-01', 'p1-02'], days: ['2026-10-31', '2026-11-01'], seconds: 750 })
    expect(cells).toEqual([
      { label: '열람 문항', value: '2개' },
      { label: '총 열람 시간', value: '12분' },
      { label: '접속한 날', value: '2일' },
      { label: '연 횟수', value: '7회' },
      { label: '마지막 열람', value: '11.1 21:40' },
    ])
  })
  it('아직 안 열었으면 빈 배열', () => {
    expect(usageStats(undefined)).toEqual([])
  })
})
