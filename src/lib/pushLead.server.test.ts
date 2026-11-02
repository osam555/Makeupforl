import { beforeEach, describe, expect, it, vi } from 'vitest'

const { send, del, subs } = vi.hoisted(() => ({
  send: vi.fn(),
  del: vi.fn(async () => {}),
  subs: { list: [] as { id: string; sub: unknown }[] },
}))
vi.mock('web-push', () => ({ default: { setVapidDetails: vi.fn(), sendNotification: send } }))
vi.mock('@/lib/firebase/admin', () => ({
  getAdminDb: async () => ({
    collection: () => ({
      get: async () => ({ docs: subs.list.map((s) => ({ id: s.id, data: () => ({ sub: s.sub }), ref: { delete: del } })) }),
    }),
  }),
}))

import { pushLead } from './pushLead.server'

const lead = { name: '김혼주', phone: '010-1234-5678', when: '1~3개월', who: '', worry: '' }

describe('pushLead', () => {
  beforeEach(() => {
    send.mockReset()
    del.mockClear()
    vi.stubEnv('VAPID_PUBLIC_KEY', 'pub')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'priv')
    subs.list = [{ id: 'a', sub: { endpoint: 'https://fcm/a' } }, { id: 'b', sub: { endpoint: 'https://fcm/b' } }]
  })

  it('키가 없으면 보내지 않는다', async () => {
    vi.stubEnv('VAPID_PRIVATE_KEY', '')
    await pushLead(lead)
    expect(send).not.toHaveBeenCalled()
  })

  it('등록된 기기마다 이름·번호를 보낸다', async () => {
    send.mockResolvedValue({})
    await pushLead(lead)
    expect(send).toHaveBeenCalledTimes(2)
    expect(JSON.parse(send.mock.calls[0][1]).body).toContain('010-1234-5678')
  })

  it('만료된 기기(410)는 지운다, 실패해도 던지지 않는다', async () => {
    send.mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 })).mockRejectedValueOnce(new Error('net'))
    await expect(pushLead(lead)).resolves.toBeUndefined()
    expect(del).toHaveBeenCalledTimes(1)
  })
})
