import { describe, expect, it } from 'vitest'

import { campaignOfLead, campaignOfSource, campaignRows, cleanFrom, leadSource } from './campaign'

describe('cleanFrom', () => {
  it('영소문자·숫자·하이픈 40자 이하만 받는다', () => {
    expect(cleanFrom('yt-shorts-01')).toBe('yt-shorts-01')
    expect(cleanFrom('a'.repeat(40))).toBe('a'.repeat(40))
  })
  it('나머지는 버린다', () => {
    expect(cleanFrom('a'.repeat(41))).toBeNull()
    expect(cleanFrom('YT-01')).toBeNull()
    expect(cleanFrom('yt_01')).toBeNull()
    expect(cleanFrom('010-1234-5678@x')).toBeNull()
    expect(cleanFrom('')).toBeNull()
    expect(cleanFrom(null)).toBeNull()
    expect(cleanFrom(['yt-01'])).toBeNull()
  })
})

describe('출처 이름', () => {
  it('상담 신청 source 는 꼬리표가 있을 때만 붙는다', () => {
    expect(leadSource('ig-reel-03')).toBe('honjoo100-chat:ig-reel-03')
    expect(leadSource(null)).toBe('honjoo100-chat')
  })
  it('source 에서 꼬리표를 되읽는다', () => {
    expect(campaignOfLead('honjoo100-chat:ig-reel-03')).toBe('ig-reel-03')
    expect(campaignOfLead('honjoo100-chat')).toBeNull()
    expect(campaignOfSource('from:yt-shorts-01')).toBe('yt-shorts-01')
    expect(campaignOfSource('naver-m')).toBeNull()
  })
})

describe('campaignRows', () => {
  it('캠페인별 도착·신청·예약함을 모아 예약·신청·도착 순으로 세운다', () => {
    const rows = campaignRows({ 'from:yt-01': 10, 'from:ig-02': 3, direct: 50 }, [
      { source: 'honjoo100-chat:yt-01', status: 'booked' },
      { source: 'honjoo100-chat:yt-01', status: 'new' },
      { source: 'honjoo100-chat:naver-ad', status: 'called' },
      { source: 'honjoo100-chat', status: 'booked' },
    ])
    expect(rows).toEqual([
      { campaign: 'yt-01', arrivals: 10, leads: 2, booked: 1 },
      { campaign: 'naver-ad', arrivals: 0, leads: 1, booked: 0 },
      { campaign: 'ig-02', arrivals: 3, leads: 0, booked: 0 },
    ])
  })
})
