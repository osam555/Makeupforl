import { beforeEach, describe, expect, it, vi } from 'vitest'

const set = vi.fn()
const del = vi.fn()
const configSet = vi.fn()
let admin: string | null = 'owner@gmail.com'
let legacy: unknown[] = []
const db = {
  collection: (name: string) =>
    name === 'site_config'
      ? { doc: () => ({ get: async () => ({ data: () => ({ members: legacy }) }), set: configSet }) }
      : { doc: () => ({ get: async () => ({ exists: false, data: () => undefined }), set, delete: del }) },
}
vi.mock('@/lib/firebase/admin', () => ({ getAdminDb: async () => db, verifyAdmin: async () => admin }))

import { POST } from './route'

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const ok = { idToken: 't', name: '김혼주', email: 'Kim@gmail.com', phone: '01012345678', until: '2027-05-01' }

describe('POST /api/wed100/members', () => {
  beforeEach(() => {
    set.mockReset(); del.mockReset(); configSet.mockReset()
    admin = 'owner@gmail.com'; legacy = []
  })

  it('관리자 아니면 401', async () => {
    admin = null
    expect((await POST(req(ok))).status).toBe(401)
    expect(set).not.toHaveBeenCalled()
  })

  it('등록 — 이메일 소문자, 전화 정리', async () => {
    const r = await POST(req(ok))
    expect(r.status).toBe(200)
    expect(set.mock.calls[0][0]).toMatchObject({ name: '김혼주', email: 'kim@gmail.com', phone: '010-1234-5678', until: '2027-05-01' })
  })

  it('틀린 입력 400', async () => {
    expect((await POST(req({ ...ok, email: 'x' }))).status).toBe(400)
  })

  it('옛 공개 명단에 있으면 거기서 뺀다', async () => {
    legacy = [{ email: 'kim@gmail.com', until: null }, { email: 'b@gmail.com', until: null }]
    await POST(req(ok))
    expect(configSet).toHaveBeenCalledWith({ members: [{ email: 'b@gmail.com', until: null }] }, { merge: true })
  })

  it('삭제', async () => {
    await POST(req({ idToken: 't', action: 'delete', email: 'kim@gmail.com' }))
    expect(del).toHaveBeenCalled()
  })
})
