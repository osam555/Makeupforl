import { describe, expect, it } from 'vitest'

import { passLine } from './wed100Access'

describe('passLine', () => {
  it('첫 화면 한 줄은 잠긴 답 수 · 3개월 값 · 예약 시 전액 차감을 쇼츠 잠금 화면과 같은 말로 말한다', () => {
    expect(passLine(93)).toBe('잠긴 답 93개 · 3개월 이용권 55,000원 · 메이크업 예약하면 전액 차감')
  })
})
