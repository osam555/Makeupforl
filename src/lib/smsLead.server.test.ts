import { afterEach, describe, expect, it, vi } from 'vitest'

import { smsLead } from './smsLead.server'

const lead = { name: '김혼주', phone: '010-1234-5678', when: '1~3개월', who: '', worry: '올림머리' }

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('smsLead', () => {
  it('키가 없으면 보내지 않는다', async () => {
    vi.stubEnv('SOLAPI_API_KEY', '')
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    await smsLead(lead)
    expect(f).not.toHaveBeenCalled()
  })

  it('가게 번호로 받는 사람마다 문자를 보낸다', async () => {
    vi.stubEnv('SOLAPI_API_KEY', 'k')
    vi.stubEnv('SOLAPI_API_SECRET', 's')
    vi.stubEnv('LEAD_SMS_TO', '010-1111-2222,01033334444')
    const f = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', f)
    await smsLead(lead)
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(String((init.headers as Record<string, string>).authorization)).toMatch(/^HMAC-SHA256 apiKey=k, date=.+, salt=.+, signature=[0-9a-f]{64}$/)
    const body = JSON.parse(init.body as string)
    expect(body.messages.map((m: { to: string }) => m.to)).toEqual(['01011112222', '01033334444'])
    expect(body.messages[0].from).toBe('023233321')
    expect(body.messages[0].text).toContain('010-1234-5678')
  })

  it('실패해도 던지지 않는다', async () => {
    vi.stubEnv('SOLAPI_API_KEY', 'k')
    vi.stubEnv('SOLAPI_API_SECRET', 's')
    vi.stubEnv('LEAD_SMS_TO', '01011112222')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('net') }))
    await expect(smsLead(lead)).resolves.toBeUndefined()
  })
})
