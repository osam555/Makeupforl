// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const docs = [
  { id: 'a', data: () => ({ name: '김혼주', phone: '010-1234-5678', when: '1~3개월', who: '신랑 어머님이에요', worry: '올림머리', source: 'honjoo100-chat:yt-shorts-01', status: 'new', createdAt: new Date().toISOString() }) },
  { id: 'b', data: () => ({ name: '옛손님', phone: '010-9999-0000', when: '아직 미정', who: '', worry: '', source: 'honjoo100-chat', status: 'done', createdAt: '2020-01-01T00:00:00.000Z' }) },
]

vi.mock('@/lib/firebase/client', () => ({ getDb: () => ({}) }))
vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  orderBy: () => ({}),
  query: () => ({}),
  onSnapshot: (_q: unknown, ok: (s: unknown) => void) => {
    ok({ docs })
    return () => {}
  },
  doc: () => ({}),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}))
vi.mock('@/components/admin/AdminGate', () => ({ default: ({ children }: { children: () => React.ReactNode }) => <>{children()}</> }))

import LeadsGate from './LeadsView'

const AdminLeadsPage = () => <LeadsGate arrivals={{ 'from:yt-shorts-01': 7 }} />

afterEach(cleanup)

describe('/admin/leads', () => {
  it('접수한 손님 이름과 누를 수 있는 전화번호를 보인다', async () => {
    render(<AdminLeadsPage />)
    expect(await screen.findByText('김혼주')).toBeTruthy()
    expect(screen.getByRole('link', { name: /010-1234-5678/ }).getAttribute('href')).toBe('tel:010-1234-5678')
  })

  it('보관 기간이 지난 접수를 알린다', async () => {
    render(<AdminLeadsPage />)
    expect(await screen.findByText(/보관 기간\(365일\)이 지난 접수가 1건/)).toBeTruthy()
  })
  it('열면 쌓인 상담 알림(앱 아이콘 숫자)을 지운다', async () => {
    const close = vi.fn()
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve({ getNotifications: async () => [{ close }, { close }] }) },
    })
    render(<AdminLeadsPage />)
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(2))
  })

  it('캠페인 표에 꼬리표별 도착·신청을 보이고, 접수 카드에 꼬리표를 단다', async () => {
    render(<AdminLeadsPage />)
    await screen.findByText('김혼주')
    const cells = screen.getAllByText('yt-shorts-01').length
    expect(cells).toBe(2) // 표 한 줄 + 김혼주 카드
    expect(screen.getByText('7')).toBeTruthy()
  })
})
