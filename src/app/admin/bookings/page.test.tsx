// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { del } = vi.hoisted(() => ({ del: vi.fn(async () => {}) }))
const docs = [
  { id: 's1', data: () => ({ name: '샘플', phone: '010-0000-0000', email: null, service_type: 'shop', booking_date: '2026-08-17', booking_time: '10:00', message: null, status: 'pending', created_at: '2026-08-01T00:00:00Z' }) },
]
vi.mock('@/lib/firebase/client', () => ({ getDb: () => ({}) }))
vi.mock('firebase/firestore', () => ({
  collection: () => ({}), orderBy: () => ({}), query: () => ({}), where: () => ({}),
  onSnapshot: (_q: unknown, ok: (s: unknown) => void) => { ok({ docs }); return () => {} },
  doc: () => ({}), updateDoc: vi.fn(), deleteDoc: del,
}))
vi.mock('@/components/admin/AdminShell', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('@/components/admin/AdminGate', () => ({ default: ({ children }: { children: () => React.ReactNode }) => <>{children()}</> }))

import AdminBookingsPage from './page'

afterEach(cleanup)

describe('/admin/bookings', () => {
  it('샘플 예약을 지울 수 있다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AdminBookingsPage />)
    fireEvent.click(await screen.findByRole('button', { name: '지우기' }))
    await vi.waitFor(() => expect(del).toHaveBeenCalled())
  })
})
