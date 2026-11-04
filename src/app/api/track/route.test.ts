import { beforeEach, describe, expect, it, vi } from 'vitest'

const set = vi.fn(async (v: unknown) => void v)
vi.mock('@/lib/firebase/admin', () => ({
  getAdminDb: async () => ({ collection: () => ({ doc: () => ({ set }) }) }),
}))
vi.mock('firebase-admin/firestore', () => ({ FieldValue: { increment: (n: number) => n } }))

import { POST } from './route'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 KAKAOTALK'
const req = (body: unknown, ua: string = UA) =>
  new Request('http://x/api/track', { method: 'POST', headers: { 'user-agent': ua }, body: JSON.stringify(body) })
const first = { path: '/honjoo100', kind: 'view', newSession: true, ref: '' }
const saved = () => set.mock.lastCall?.[0] as Record<string, Record<string, number>>

describe('POST /api/track — 캠페인 꼬리표', () => {
  beforeEach(() => set.mockClear())

  it('from 이 있으면 referrer 대신 꼬리표를 출처로 센다', async () => {
    await POST(req({ ...first, ref: 'https://m.youtube.com/', from: 'yt-shorts-01' }))
    expect(saved().sources).toEqual({ 'from:yt-shorts-01': 1 })
    expect(saved().landings).toEqual({ 'from:yt-shorts-01___honjoo100': 1 })
  })

  it('허용하지 않는 from 은 버리고 referrer 로 돌아간다', async () => {
    await POST(req({ ...first, from: 'YT/../x' }))
    expect(saved().sources).toEqual({ direct: 1 })
  })

  it('저장하는 값에 UA·IP 가 없다', async () => {
    await POST(req({ ...first, from: 'ig-reel-03' }))
    expect(JSON.stringify(saved())).not.toMatch(/iPhone|KAKAOTALK/)
  })

  it('봇은 꼬리표가 있어도 세지 않는다', async () => {
    const r = await POST(req({ ...first, from: 'yt-shorts-01' }, 'Googlebot/2.1'))
    expect(await r.json()).toMatchObject({ skipped: true })
    expect(set).not.toHaveBeenCalled()
  })
})
