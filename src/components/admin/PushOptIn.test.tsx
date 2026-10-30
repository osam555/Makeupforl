// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PushOptIn from './PushOptIn'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('PushOptIn', () => {
  it('푸시를 못 쓰는 브라우저면 이유를 말한다', () => {
    render(<PushOptIn />)
    expect(screen.getByText(/이 브라우저는 알림을 받을 수 없습니다/)).toBeTruthy()
  })
  it('카톡 인앱 브라우저면 다른 브라우저로 열라고 안내한다', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Linux; Android 14; SM-S918N; wv) KAKAOTALK 10.8.0')
    render(<PushOptIn />)
    expect(screen.getByText(/다른 브라우저로 열기/)).toBeTruthy()
  })
})
