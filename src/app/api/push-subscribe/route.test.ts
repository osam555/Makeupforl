import { beforeEach, describe, expect, it, vi } from 'vitest'

const { set, admin } = vi.hoisted(() => ({ set: vi.fn(async () => {}), admin: { email: 'a@b.c' as string | null } }))
vi.mock('@/lib/firebase/admin', () => ({
  verifyAdmin: async () => admin.email,
  getAdminDb: async () => ({ collection: () => ({ doc: () => ({ set }) }) }),
}))

import { POST } from './route'

const req = (b: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(b) })
const sub = { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'p', auth: 'a' } }

describe('POST /api/push-subscribe', () => {
  beforeEach(() => {
    set.mockClear()
    admin.email = 'a@b.c'
  })
  it('관리자가 아니면 401', async () => {
    admin.email = null
    expect((await POST(req({ idToken: 't', sub }))).status).toBe(401)
    expect(set).not.toHaveBeenCalled()
  })
  it('구독 형식이 아니면 400', async () => {
    expect((await POST(req({ idToken: 't', sub: { endpoint: 'x' } }))).status).toBe(400)
  })
  it('관리자 기기를 저장한다', async () => {
    expect((await POST(req({ idToken: 't', sub }))).status).toBe(200)
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@b.c', sub }))
  })
})
