import { afterEach, describe, expect, it, vi } from 'vitest'

import { notifyLead } from './notifyLead.server'

const lead = { name: '김혼주', phone: '010-1234-5678', when: '1~3개월', who: '신랑 어머님이에요', worry: '올림머리' }

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('notifyLead', () => {
  it('키가 없으면 보내지 않는다', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    await notifyLead(lead)
    expect(f).not.toHaveBeenCalled()
  })

  it('원장·매니저 두 사람에게 이름·번호를 담아 보낸다', async () => {
    vi.stubEnv('RESEND_API_KEY', 'k')
    const f = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', f)
    await notifyLead(lead)
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.to).toEqual(['makeupforl77@gmail.com', 'john.wu571@gmail.com'])
    expect(body.text).toContain('010-1234-5678')
  })

  it('발송이 실패해도 던지지 않는다', async () => {
    vi.stubEnv('RESEND_API_KEY', 'k')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('net') }))
    await expect(notifyLead(lead)).resolves.toBeUndefined()
  })
})
