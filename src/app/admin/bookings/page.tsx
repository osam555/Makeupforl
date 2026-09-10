'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, Mail, MessageSquare, Phone, User } from 'lucide-react'

import { getDb } from '@/lib/firebase/client'
import AdminGate from '@/components/admin/AdminGate'
import AdminShell from '@/components/admin/AdminShell'
import { Chips, Empty, Note, Panel, Stat } from '@/components/admin/AdminUI'

interface Booking {
  id: string
  name: string
  phone: string
  email: string | null
  service_type: string
  booking_date: string
  booking_time: string
  message: string | null
  status: string
  created_at: string
}

type Filter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'

const FILTERS = [
  ['all', '전체'],
  ['pending', '대기중'],
  ['confirmed', '확정'],
  ['completed', '완료'],
  ['cancelled', '취소'],
] as const

const STATUS_LABEL: Record<string, string> = {
  pending: '대기중',
  confirmed: '확정',
  completed: '완료',
  cancelled: '취소',
}

/**
 * 상태 색.
 *
 * 파란색을 쓰지 않는다. 어두운 화면에서 쓰는 색표(admin-theme.css)에 파랑 계열이
 * 없어, 밤에 열면 확정 딱지만 눈이 부시게 밝았다. 확정은 이 집의 자주색으로,
 * 완료는 초록으로 둔다 — 자주색이 "우리가 잡았다", 초록이 "끝났다" 다.
 */
const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-[var(--a-f6e9ed)] text-[var(--a-a63d5a)]',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

/**
 * 예약 관리.
 *
 * 이 화면만 오래도록 다른 모습이었다 — 회색 바탕에 3xl 제목, 파란 단추, 그리고
 * 탭이 아예 없어서 여기 들어오면 다른 관리 화면으로 돌아갈 길이 없었다.
 * 100문100답이 먼저 있었고 나머지가 하나씩 붙는 동안 이 화면만 처음 모습으로
 * 남아 있었던 탓이다. 다른 화면과 같은 조각(AdminUI)으로 다시 짠다.
 */
function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [live, setLive] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [reconnectKey, setReconnectKey] = useState(0)
  const [err, setErr] = useState<string | null>(null)

  /**
   * 상태 바꾸기.
   *
   * 전에는 실패하면 alert 창이 떴다. 창은 화면을 덮고, 무엇을 하다 실패했는지는
   * 닫는 순간 사라진다. 화면 안에 남겨 둔다.
   */
  const updateStatus = async (id: string, next: string) => {
    if (next === 'cancelled' && !confirm('이 예약을 취소로 바꿀까요?')) return
    setErr(null)
    try {
      const db = getDb()
      if (!db) throw new Error('firebase-not-configured')
      const { doc, updateDoc } = await import('firebase/firestore')
      await updateDoc(doc(db, 'bookings', id), { status: next })
      // 실시간 구독(onSnapshot)이 화면을 자동으로 갱신하므로 별도 재조회는 필요 없다.
    } catch (e) {
      setErr(`상태를 바꾸지 못했습니다 — ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Firestore 실시간 구독: 탭을 열어둔 채로도 새 예약/상태 변경이 즉시 반영된다.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    setLoading(true)
    ;(async () => {
      try {
        const db = getDb()
        if (!db) throw new Error('firebase-not-configured')
        const { collection, onSnapshot, orderBy, query, where } = await import('firebase/firestore')
        const base = collection(db, 'bookings')
        const q =
          filter !== 'all'
            ? query(base, where('status', '==', filter), orderBy('created_at', 'desc'))
            : query(base, orderBy('created_at', 'desc'))

        if (cancelled) return

        unsubscribe = onSnapshot(
          q,
          (snap) => {
            setBookings(snap.docs.map((d) => ({ ...(d.data() as Omit<Booking, 'id'>), id: d.id })))
            setLive(true)
            setLastSync(new Date())
            setLoading(false)
          },
          (error) => {
            setErr(`예약을 읽지 못했습니다 — ${error.message}`)
            setLive(false)
            setLoading(false)
          },
        )
      } catch (e) {
        setErr(`예약을 읽지 못했습니다 — ${e instanceof Error ? e.message : String(e)}`)
        setLive(false)
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      setLive(false)
      if (unsubscribe) unsubscribe()
    }
  }, [filter, reconnectKey])

  const count = (s: string) => bookings.filter((b) => b.status === s).length

  return (
    <div className="space-y-5">
      {/* 거르기 + 연결 상태 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chips<Filter> value={filter} onChange={setFilter} options={FILTERS} />
        </div>
        <button
          type="button"
          onClick={() => setReconnectKey((k) => k + 1)}
          className="ml-auto flex items-center gap-1.5 text-[0.6875rem] text-[var(--a-8a7a72)] hover:text-[var(--a-a63d5a)]"
          title="다시 연결"
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              live ? 'animate-pulse bg-emerald-500' : 'bg-gray-300'
            }`}
            aria-hidden
          />
          {live ? '실시간 연결됨' : '연결 대기 중'}
          {lastSync && ` · ${lastSync.toLocaleTimeString('ko-KR')} 갱신`}
        </button>
      </div>

      {err && <Note kind="err">{err}</Note>}

      {/* 한눈에 */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <Stat
          label="대기중"
          value={`${count('pending')}건`}
          hint="답을 기다리는 예약"
          warn={count('pending') > 0}
        />
        <Stat label="확정" value={`${count('confirmed')}건`} hint="날짜를 잡은 예약" />
        <Stat label="완료" value={`${count('completed')}건`} hint="치른 예약" />
        <Stat
          label="전체"
          value={`${bookings.length}건`}
          hint={filter === 'all' ? '지금까지 들어온 전부' : `'${STATUS_LABEL[filter]}' 만 세는 중`}
        />
      </div>

      {loading ? (
        <Empty>읽는 중…</Empty>
      ) : bookings.length === 0 ? (
        <Panel title="예약">
          <Empty>
            {filter === 'all' ? '아직 들어온 예약이 없습니다' : '이 상태의 예약이 없습니다'}
          </Empty>
        </Panel>
      ) : (
        <ul className="space-y-2.5">
          {bookings.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-[var(--a-e0d6cc)] bg-white p-3.5 sm:p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold ${
                    STATUS_TONE[b.status] ?? STATUS_TONE.cancelled
                  }`}
                >
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
                <span className="rounded-full border border-[var(--a-e0d6cc)] px-2.5 py-0.5 text-[0.6875rem] font-bold text-[var(--a-6b5d57)]">
                  {b.service_type === 'shop' ? '샵 서비스' : '출장 메이크업'}
                </span>
                <span className="ml-auto text-[0.6875rem] text-[var(--a-8a7a72)]">
                  {new Date(b.created_at).toLocaleString('ko-KR')} 신청
                </span>
              </div>

              {/*
                예식 날짜를 먼저, 크게.

                전에는 이름·전화·메일·날짜가 같은 크기로 네 칸에 나란히 있었다.
                예약에서 먼저 보게 되는 것은 "언제" 다 — 그 다음이 누구인가이고,
                전화는 읽는 것이 아니라 누르는 것이다.
              */}
              <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="flex items-center gap-1.5 text-base font-extrabold text-[var(--a-2e2724)]">
                  <Calendar className="h-4 w-4 text-[var(--a-a3948c)]" aria-hidden />
                  {fmtDate(b.booking_date)}
                </span>
                <span className="flex items-center gap-1 text-sm font-bold text-[var(--a-3a322e)]">
                  <Clock className="h-3.5 w-3.5 text-[var(--a-a3948c)]" aria-hidden />
                  {b.booking_time}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-[var(--a-3a322e)]">
                  <User className="h-3.5 w-3.5 text-[var(--a-a3948c)]" aria-hidden />
                  {b.name}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <a
                  href={`tel:${b.phone}`}
                  className="flex items-center gap-1.5 font-bold text-[var(--a-a63d5a)]"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {b.phone}
                </a>
                {b.email && (
                  <a
                    href={`mailto:${b.email}`}
                    className="flex min-w-0 items-center gap-1.5 text-[var(--a-6b5d57)]"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{b.email}</span>
                  </a>
                )}
              </div>

              {b.message && (
                <p className="mt-2.5 flex items-start gap-2 rounded-lg bg-[var(--a-f7f1ec)] p-3 text-xs leading-relaxed text-[var(--a-3a322e)]">
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--a-a3948c)]" aria-hidden />
                  {b.message}
                </p>
              )}

              {/* 할 수 있는 일. 휴대전화에서는 한 줄을 꽉 채워 과녁을 키운다 */}
              <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--a-f0e9e3)] pt-3">
                {b.status === 'pending' && (
                  <Action tone="primary" onClick={() => void updateStatus(b.id, 'confirmed')}>
                    확정하기
                  </Action>
                )}
                {b.status === 'confirmed' && (
                  <Action tone="done" onClick={() => void updateStatus(b.id, 'completed')}>
                    완료로 표시
                  </Action>
                )}
                {b.status !== 'cancelled' && b.status !== 'completed' && (
                  <Action tone="quiet" onClick={() => void updateStatus(b.id, 'cancelled')}>
                    취소
                  </Action>
                )}
                {(b.status === 'cancelled' || b.status === 'completed') && (
                  <span className="text-[0.6875rem] text-[var(--a-8a7a72)]">
                    끝난 예약입니다. 더 할 일이 없습니다.
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** 예약 카드의 단추. 색이 곧 뜻이다 — 자주색은 잡는 것, 초록은 끝내는 것 */
function Action({
  tone,
  onClick,
  children,
}: {
  tone: 'primary' | 'done' | 'quiet'
  onClick: () => void
  children: React.ReactNode
}) {
  const style =
    tone === 'primary'
      ? 'bg-[var(--a-a63d5a)] text-white hover:bg-[var(--a-8a2e48)]'
      : tone === 'done'
        ? 'bg-[var(--a-3f6b57)] text-white hover:bg-[var(--a-2e7d5b)]'
        : 'border border-[var(--a-e0d6cc)] text-[var(--a-6b5d57)] hover:text-[var(--a-a63d5a)]'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold transition-colors sm:flex-none ${style}`}
    >
      {children}
    </button>
  )
}

/** 2026-09-12 → 9월 12일 (토). 요일이 있어야 예식 날짜인지 바로 안다 */
function fmtDate(s: string): string {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

export default function AdminBookingsPage() {
  return (
    <AdminShell active="/admin/bookings" title="예약">
      <AdminGate title="예약 관리">{() => <AdminBookings />}</AdminGate>
    </AdminShell>
  )
}
