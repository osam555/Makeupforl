'use client'

import { useEffect, useState } from 'react'
import { Phone } from 'lucide-react'

import { getDb } from '@/lib/firebase/client'
import AdminGate from '@/components/admin/AdminGate'
import AdminShell from '@/components/admin/AdminShell'
import { Chips, Empty, Note, Panel, Stat } from '@/components/admin/AdminUI'
import { type ConsultLead, LEAD_KEEP_DAYS, isLeadExpired, leadStatusLabel } from '@/lib/consultLeads'

type Filter = 'all' | 'new' | 'called' | 'done'
const FILTERS = [
  ['all', '전체'],
  ['new', '새 접수'],
  ['called', '연락함'],
  ['done', '끝남'],
] as const

// 예약 화면과 같은 색 규칙 — 파란색 없이, 새 접수는 호박색(기다림), 연락함은 이 집 자주색
const TONE: Record<string, string> = {
  new: 'bg-amber-100 text-amber-800',
  called: 'bg-[var(--a-f6e9ed)] text-[var(--a-a63d5a)]',
  done: 'bg-emerald-100 text-emerald-800',
}

/**
 * 상담 신청 — 100문100답 안내 채팅에서 손님이 남긴 연락처.
 *
 * 예약(bookings) 화면과 같은 방식으로 읽는다: 클라이언트 SDK 실시간 구독, 보안 규칙의
 * isAdmin() 이 문지기. 쓰기(create)는 규칙이 막고 /api/consult-lead 만 하므로, 여기서는
 * 상태 바꾸기와 지우기만 한다.
 *
 * 동의 문구에 "보관 1년" 이라고 적었다. 지난 것을 자동으로 지우는 일정 작업은 아직 없어서,
 * 기간이 지난 접수를 맨 위에 따로 띄우고 한 번에 지우는 단추를 둔다.
 */
function AdminLeads() {
  const [leads, setLeads] = useState<ConsultLead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let unsub: (() => void) | undefined
    let cancelled = false
    ;(async () => {
      try {
        const db = getDb()
        if (!db) throw new Error('firebase-not-configured')
        const { collection, onSnapshot, orderBy, query } = await import('firebase/firestore')
        if (cancelled) return
        unsub = onSnapshot(
          query(collection(db, 'consult_leads'), orderBy('createdAt', 'desc')),
          (snap) => {
            setLeads(snap.docs.map((d) => ({ ...(d.data() as Omit<ConsultLead, 'id'>), id: d.id })))
            setLoading(false)
          },
          (e) => {
            setErr(`상담 신청을 읽지 못했습니다 — ${e.message}`)
            setLoading(false)
          },
        )
      } catch (e) {
        setErr(`상담 신청을 읽지 못했습니다 — ${e instanceof Error ? e.message : String(e)}`)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  async function setStatus(id: string, status: ConsultLead['status']) {
    setErr(null)
    try {
      const db = getDb()
      if (!db) throw new Error('firebase-not-configured')
      const { doc, updateDoc } = await import('firebase/firestore')
      await updateDoc(doc(db, 'consult_leads', id), { status })
    } catch (e) {
      setErr(`상태를 바꾸지 못했습니다 — ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  async function remove(ids: string[]) {
    if (!ids.length || !confirm(`${ids.length}건을 지울까요? 되돌릴 수 없습니다.`)) return
    setErr(null)
    try {
      const db = getDb()
      if (!db) throw new Error('firebase-not-configured')
      const { deleteDoc, doc } = await import('firebase/firestore')
      await Promise.all(ids.map((id) => deleteDoc(doc(db, 'consult_leads', id))))
    } catch (e) {
      setErr(`지우지 못했습니다 — ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const expired = leads.filter((l) => isLeadExpired(l.createdAt))
  const shown = filter === 'all' ? leads : leads.filter((l) => l.status === filter)
  const count = (s: string) => leads.filter((l) => l.status === s).length

  return (
    <div className="space-y-5">
      <Chips<Filter> value={filter} onChange={setFilter} options={FILTERS} />
      {err && <Note kind="err">{err}</Note>}
      {expired.length > 0 && (
        <Note kind="err">
          보관 기간({LEAD_KEEP_DAYS}일)이 지난 접수가 {expired.length}건 있습니다. 동의받은 기간이 끝났으니 지워 주세요.{' '}
          <button type="button" className="font-bold underline" onClick={() => remove(expired.map((l) => l.id))}>
            지금 지우기
          </button>
        </Note>
      )}

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <Stat label="새 접수" value={`${count('new')}건`} hint="아직 연락 안 함" warn={count('new') > 0} />
        <Stat label="연락함" value={`${count('called')}건`} hint="통화했거나 문자 보냄" />
        <Stat label="전체" value={`${leads.length}건`} hint="지금 보관 중" />
      </div>

      {loading ? (
        <Empty>읽는 중…</Empty>
      ) : shown.length === 0 ? (
        <Panel title="상담 신청">
          <Empty>{filter === 'all' ? '아직 들어온 상담 신청이 없습니다' : '이 상태의 접수가 없습니다'}</Empty>
        </Panel>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((l) => (
            <li key={l.id} className="rounded-xl border border-[var(--a-e0d6cc)] bg-white p-3.5 sm:p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold ${TONE[l.status] ?? TONE.done}`}>
                  {leadStatusLabel(l.status)}
                </span>
                {l.when && (
                  <span className="rounded-full border border-[var(--a-e0d6cc)] px-2.5 py-0.5 text-[0.6875rem] font-bold text-[var(--a-6b5d57)]">
                    결혼식 {l.when}
                  </span>
                )}
                <span className="ml-auto text-[0.6875rem] text-[var(--a-8a7a72)]">
                  {new Date(l.createdAt).toLocaleString('ko-KR')} 접수
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-base font-extrabold text-[var(--a-2e2724)]">{l.name}</span>
                {/* 전화는 읽는 것이 아니라 누르는 것 — 예약 화면과 같다 */}
                <a href={`tel:${l.phone}`} className="flex items-center gap-1.5 text-sm font-bold text-[var(--a-a63d5a)]">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {l.phone}
                </a>
              </div>
              {(l.who || l.worry) && (
                <p className="mt-2 rounded-lg bg-[var(--a-f7f1ec)] p-3 text-xs leading-relaxed text-[var(--a-3a322e)]">
                  {[l.who, l.worry].filter(Boolean).join(' · ')}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {l.status !== 'called' && (
                  <button type="button" className={btn} onClick={() => setStatus(l.id, 'called')}>
                    연락함
                  </button>
                )}
                {l.status !== 'done' && (
                  <button type="button" className={btn} onClick={() => setStatus(l.id, 'done')}>
                    끝남
                  </button>
                )}
                <button type="button" className={`${btn} ml-auto text-[var(--a-8a7a72)]`} onClick={() => remove([l.id])}>
                  지우기
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const btn =
  'rounded-lg border border-[var(--a-e0d6cc)] px-4 py-2 text-xs font-bold text-[var(--a-3a322e)] transition-colors hover:border-[var(--a-a63d5a)] hover:text-[var(--a-a63d5a)]'

export default function AdminLeadsPage() {
  return (
    <AdminShell active="/admin/leads" title="상담 신청">
      <AdminGate title="상담 신청">{() => <AdminLeads />}</AdminGate>
    </AdminShell>
  )
}
