import { describe, expect, it } from 'vitest'

import { choiceKey, choices, funnel } from './surveyStats'

describe('funnel', () => {
  it('단계별 숫자와 앞 단계 대비 남은 비율, 제출 안 한 수', () => {
    const r = funnel([
      { seen: 100, who: 40, worry: 30, form: 10, typing: 8, submit: 4, tel: 2 },
      { seen: 100, who: 20, worry: 10, form: 2, typing: 2, submit: 2 },
    ])
    expect(r.rows.map((x) => x.count)).toEqual([200, 60, 40, 12, 10, 6])
    expect(r.rows[0].keep).toBeNull()
    expect(r.rows[1].keep).toBe(30)
    expect(r.rows[5].keep).toBe(60)
    expect(r.abandoned).toBe(6)
    expect(r.side.find((x) => x.key === 'tel')?.count).toBe(2)
  })
  it('빈 날에도 0 으로 나온다', () => {
    const r = funnel([])
    expect(r.rows.every((x) => x.count === 0)).toBe(true)
    expect(r.rows[1].keep).toBe(0)
    expect(r.abandoned).toBe(0)
  })
})

describe('choices', () => {
  it('고른 답을 합쳐 많은 순으로', () => {
    expect(choices([{ worryChoice: { a: 1, b: 3 } }, { worryChoice: { a: 4 } }], 'worryChoice')).toEqual([
      ['a', 5],
      ['b', 3],
    ])
  })
  it('필드 이름에 못 쓰는 글자를 바꾼다', () => {
    expect(choiceKey('네, 신랑 쪽 혼주예요')).toBe('네,_신랑_쪽_혼주예요')
  })
})
