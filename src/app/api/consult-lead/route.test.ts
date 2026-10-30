import { beforeEach, describe, expect, it, vi } from 'vitest'

const add = vi.fn()
let db: unknown = { collection: () => ({ add }) }
vi.mock('@/lib/firebase/admin', () => ({ getAdminDb: async () => db }))

const { notify } = vi.hoisted(() => ({ notify: vi.fn(async (_l: unknown) => {}) }))
vi.mock('@/lib/notifyLead.server', () => ({ notifyLead: notify }))

import { POST } from './route'

const req = (body: unknown) =>
  new Request('http://x/api/consult-lead', { method: 'POST', body: JSON.stringify(body) })
const ok = { name: '김혼주', phone: '010-1234-5678', when: '1~3개월', who: '신랑 어머님', worry: '올림머리', agree: true }

describe('POST /api/consult-lead', () => {
  beforeEach(() => {
    add.mockReset()
    notify.mockClear()
    db = { collection: () => ({ add }) }
  })

  it('동의가 없으면 400, 저장 안 함', async () => {
    const r = await POST(req({ ...ok, agree: false }))
    expect(r.status).toBe(400)
    expect(add).not.toHaveBeenCalled()
  })

  it('휴대전화 형식이 아니면 400', async () => {
    expect((await POST(req({ ...ok, phone: '02-323-3321' }))).status).toBe(400)
  })

  it('숨은 칸이 채워지면 성공한 척하고 저장 안 함', async () => {
    const r = await POST(req({ ...ok, website: 'spam' }))
    expect(r.status).toBe(200)
    expect(add).not.toHaveBeenCalled()
  })

  it('정상 접수는 하이픈 붙여 저장', async () => {
    const r = await POST(req({ ...ok, phone: '01012345678' }))
    expect(r.status).toBe(200)
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ name: '김혼주', phone: '010-1234-5678', status: 'new' }))
  })

  it('서비스 계정이 없으면 503', async () => {
    db = null
    expect((await POST(req(ok))).status).toBe(503)
  })
  it('정상 접수는 원장·매니저에게 알림', async () => {
    await POST(req(ok))
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ name: '김혼주', phone: '010-1234-5678' }))
  })

  it('봇·검증 실패는 알림 안 함', async () => {
    await POST(req({ ...ok, website: 'x' }))
    await POST(req({ ...ok, agree: false }))
    expect(notify).not.toHaveBeenCalled()
  })
})
