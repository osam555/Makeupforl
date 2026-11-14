// npm test(vitest)로 돈다. node:test 로 썼더니 vitest 가 「No test suite found」로 이 파일을 실패 처리했다(2026-11-14).
import { describe, expect, it } from 'vitest'

import { fromTag } from './trackSource'

describe('fromTag', () => {
  it('쇼츠 프로필 링크의 ?from=yt 는 youtube-shorts 출처가 된다', () => {
    expect(fromTag('yt')).toBe('youtube-shorts')
  })

  it('모르는 꼬리표는 받지 않는다 — 아무 문자열이나 문서 열쇠가 되면 안 된다', () => {
    expect(fromTag('')).toBeNull()
    expect(fromTag('__proto__')).toBeNull()
    expect(fromTag('toString')).toBeNull()
  })
})
