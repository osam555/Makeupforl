'use client'

import { useEffect, useState } from 'react'
import { Phone } from 'lucide-react'

import { getDb, getFirebaseApp } from '@/lib/firebase/client'
import AdminGate from '@/components/admin/AdminGate'
import AdminShell from '@/components/admin/AdminShell'
import { Empty, Note, Panel, Stat } from '@/components/admin/AdminUI'
import { normalizeMembers, todayKST, type Wed100Member } from '@/lib/wed100Access'
import { REGISTER_MONTHS, addMonths, type Wed100MemberRecord } from '@/lib/wed100Members'

type Row = Partial<Wed100MemberRecord> & Wed100Member & { legacy?: boolean }

const input =
  'h-11 w-full rounded-lg border border-[var(--a-d4c7be)] bg-white px-3 text-sm outline-none focus:border-[var(--a-a63d5a)]'

async function idToken(): Promise<string> {
  const app = getFirebaseApp()
  if (!app) throw new Error('Firebase 가 설정되지 않았습니다.')
  const { getAuth } = await import('firebase/auth')
  const t = await getAuth(app).currentUser?.getIdToken()
  if (!t) throw new Error('다시 로그인해 주세요.')
  return t
}

/**
 * 100문100답 이용권 회원 — 값을 낸 분을 한 명씩 등록한다.
 *
 * 전에는 공개 범위 설정 아래 글상자에 "이메일 기한" 을 줄마다 적었다. 이름·전화가 없어
 * 누가 누군지 몰랐고, 그 문서(site_config)는 공개 읽기라 개인정보를 더할 수도 없었다.
 * 그래서 관리자만 읽는 wed100_members 로 옮겼다. 옛 명단의 사람도 여기 함께 보이고,
 * 이름을 채워 저장하면 새 명단으로 옮겨진다.
 *
 * 기본 기간은 이용권과 같은 3개월 — 날짜 칸을 고치면 그 날짜로 저장된다.
 */
function Members() {
  const [rows, setRows] = useState<Row[]>([])
  const [legacy, setLegacy] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const blank = () => ({ name: '', email: '', phone: '', until: addMonths(REGISTER_MONTHS) })
  const [form, setForm] = useState(blank)

  useEffect(() => {
    let unsub: (() => void) | undefined
    ;(async () => {
      try {
        const db = getDb()
        if (!db) throw new Error('Firebase 가 설정되지 않았습니다.')
        const { collection, doc, getDoc, onSnapshot } = await import('firebase/firestore')
        unsub = onSnapshot(
          collection(db, 'wed100_members'),
          (snap) => {
            setRows(snap.docs.map((d) => d.data() as Row))
            setLoading(false)
          },
          (e) => {
            setMsg({ ok: false, text: `회원 명단을 읽지 못했습니다 — ${e.message} (보안 규칙 배포가 필요할 수 있습니다)` })
            setLoading(false)
          },
        )
        const cfg = await getDoc(doc(db, 'site_config', 'wed100'))
        setLegacy(normalizeMembers(cfg.data()?.members).map((m) => ({ ...m, legacy: true })))
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
        setLoading(false)
      }
    })()
    return () => unsub?.()
  }, [])

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/wed100/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: await idToken(), ...body }),
    })
    const j = await res.json()
    if (!j.ok) throw new Error(j.error)
    return j
  }

  const save = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const j = await post({ action: 'save', ...form })
      setLegacy((l) => l.filter((m) => m.email !== j.email))
      setMsg({ ok: true, text: `${form.name} 님 ${j.renewed ? '기한을 고쳤습니다' : '등록했습니다'} — ${j.until}까지` })
      setForm(blank())
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (r: Row) => {
    if (!confirm(`${r.name || r.email} 님을 지울까요?\n다음 접속부터 잠긴 문항이 막힙니다.`)) return
    try {
      await post({ action: 'delete', email: r.email })
      setLegacy((l) => l.filter((m) => m.email !== r.email))
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    }
  }

  const edit = (r: Row) => {
    setForm({ name: r.name ?? '', email: r.email, phone: r.phone ?? '', until: r.until ?? addMonths(REGISTER_MONTHS) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const today = todayKST()
  const all: Row[] = [...rows, ...legacy.filter((l) => !rows.some((r) => r.email === l.email))].sort((a, b) =>
    (b.until ?? '9999').localeCompare(a.until ?? '9999'),
  )
  const stale = all.filter((r) => !!r.until && addMonths(12, r.until) < today)
  const active = all.filter((r) => !r.until || r.until >= today).length

  return (
    <div className="space-y-5">
      <Panel title="회원 등록">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-[var(--a-3a322e)]">
            이름
            <input className={`${input} mt-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="김혼주" />
          </label>
          <label className="block text-xs font-bold text-[var(--a-3a322e)]">
            지메일 <span className="font-normal text-[var(--a-8a7a72)]">— 이 계정으로 로그인하면 열립니다</span>
            <input className={`${input} mt-1`} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="hong@gmail.com" autoCapitalize="off" />
          </label>
          <label className="block text-xs font-bold text-[var(--a-3a322e)]">
            전화번호 <span className="font-normal text-[var(--a-8a7a72)]">— 비워도 됩니다</span>
            <input className={`${input} mt-1`} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-1234-5678" />
          </label>
          <label className="block text-xs font-bold text-[var(--a-3a322e)]">
            이용 기한 <span className="font-normal text-[var(--a-8a7a72)]">— 기본 오늘부터 {REGISTER_MONTHS}개월, 고칠 수 있습니다</span>
            <input className={`${input} mt-1`} type="date" value={form.until} min={today} onChange={(e) => setForm({ ...form, until: e.target.value })} />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[3, 6, 12].map((n) => (
            <button key={n} type="button" onClick={() => setForm({ ...form, until: addMonths(n) })}
              className="rounded-full border border-[var(--a-e0d6cc)] px-3 py-1 text-xs text-[var(--a-6b5d57)] hover:border-[var(--a-a63d5a)]">
              오늘부터 {n}개월
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void save()} disabled={busy}
          className="mt-3 h-11 w-full rounded-lg bg-[var(--a-221d1b)] text-sm font-bold text-white disabled:opacity-50">
          {busy ? '저장 중…' : '저장'}
        </button>
        <p className="mt-2 text-[0.6875rem] text-[var(--a-8a7a72)]">같은 지메일을 다시 저장하면 새로 생기지 않고 기한·이름만 바뀝니다.</p>
      </Panel>

      {msg && <Note kind={msg.ok ? 'ok' : 'err'}>{msg.text}</Note>}
      {/* 개인정보처리방침: 이용 기한이 끝나고 1년 보관 후 파기. 자동 삭제가 없어 여기서 알린다 */}
      {stale.length > 0 && (
        <Note kind="err">
          이용 기한이 끝나고 1년이 지난 분이 {stale.length}명 있습니다 ({stale.map((r) => r.name || r.email).join(', ')}).
          개인정보처리방침의 보관 기간이 끝났으니 [지우기]로 지워 주세요.
        </Note>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="이용 중" value={`${active}명`} hint="기한이 남은 분" />
        <Stat label="전체" value={`${all.length}명`} hint="기간 지난 분 포함" />
      </div>

      {loading ? (
        <Empty>읽는 중…</Empty>
      ) : all.length === 0 ? (
        <Panel title="회원">
          <Empty>아직 등록한 회원이 없습니다</Empty>
        </Panel>
      ) : (
        <ul className="space-y-2.5">
          {all.map((r) => {
            const expired = !!r.until && r.until < today
            return (
              <li key={r.email} className="rounded-xl border border-[var(--a-e0d6cc)] bg-white p-3.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-base font-extrabold text-[var(--a-2e2724)]">{r.name || '이름 없음'}</span>
                  <span className="text-sm text-[var(--a-6b5d57)]">{r.email}</span>
                  <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold ${expired ? 'bg-[var(--a-f6e9ed)] text-[var(--a-a63d5a)]' : 'bg-emerald-100 text-emerald-800'}`}>
                    {r.until ? `${r.until}까지${expired ? ' · 지남' : ''}` : '기한 없음'}
                  </span>
                </div>
                {r.phone && (
                  <a href={`tel:${r.phone}`} className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--a-a63d5a)]">
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    {r.phone}
                  </a>
                )}
                {r.legacy && (
                  <p className="mt-1.5 text-[0.6875rem] text-[var(--a-8a7a72)]">옛 명단에서 온 분 — [고치기]로 이름을 채워 저장하면 새 명단으로 옮겨집니다.</p>
                )}
                <div className="mt-2 flex gap-2 text-xs">
                  <button type="button" onClick={() => edit(r)} className="rounded-md border border-[var(--a-e0d6cc)] px-3 py-1.5">고치기·연장</button>
                  <button type="button" onClick={() => void remove(r)} className="rounded-md border border-[var(--a-e8c7cf)] px-3 py-1.5 text-[var(--a-a63d5a)]">지우기</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <AdminShell active="/admin/members" title="이용권 회원">
      <AdminGate title="이용권 회원">{() => <Members />}</AdminGate>
    </AdminShell>
  )
}
