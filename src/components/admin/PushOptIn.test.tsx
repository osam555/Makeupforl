// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import PushOptIn from './PushOptIn'

afterEach(cleanup)

describe('PushOptIn', () => {
  it('푸시를 못 쓰는 브라우저면 이유를 말한다', () => {
    render(<PushOptIn />)
    expect(screen.getByText(/이 브라우저는 알림을 받을 수 없습니다/)).toBeTruthy()
  })
})
