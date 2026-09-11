'use client'

import { useState } from 'react'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'

import { todayKST, type SeoTodo } from '@/lib/seoKeywords'

/**
 * SEO 할 일 — 코드가 못 재는 것들.
 *
 * 준비도 할 일(자동)과 한 화면에 두되 섞지 않는다. 자동 항목은 사이트를 고치면
 * 저절로 사라지고, 여기 것은 사람이 끝냈다고 표시해야 사라진다. 끝낸 것은 지우지
 * 않고 아래로 내린다 — "그거 했던가" 를 나중에 확인할 자리가 있어야 한다.
 *
 * 기한이 지난 것은 붉게. 기한이 없는 것은 급하지 않은 게 아니라 "언제라도" 다.
 */
export default function SeoTodos({
  initial,
  auth,
}: {
  /** null 이면 Firestore 를 못 읽은 것 */
  initial: SeoTodo[] | null
  auth: () => Promise<{ idToken: string } | { password: string | null }>
}) {
  const [todos, setTodos] = useState<SeoTodo[]>(initial ?? [])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [dirty, setDirty] = useState(false)

  const patch = (id: string, p: Partial<SeoTodo>) => {
    setTodos((t) => t.map((x) => (x.id === id ? { ...x, ...p } : x)))
    setDirty(true)
  }

  const save = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/site/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(await auth()), action: 'todos', todos }),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setMsg({ ok: true, text: `할 일 ${j.saved}개를 저장했습니다.` })
      setDirty(false)
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  if (initial === null) {
    return (
      <div className="rounded-xl border border-[var(--a-e0d6cc)] bg-white p-3.5 sm:p-4">
        <h3 className="text-sm font-extrabold text-[var(--a-2e2724)]">SEO 할 일</h3>
        <p className="mt-2 text-[0.6875rem] leading-relaxed text-[var(--a-a63d5a)]">
          Firestore 를 읽지 못해 목록을 보여 줄 수 없습니다. 이 목록은 시드가 없습니다 —
          서비스 계정(FIREBASE_SERVICE_ACCOUNT)이 설정된 환경에서만 보입니다.
        </p>
      </div>
    )
  }

  const today = todayKST()
  const open = todos.filter((t) => !t.done).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
  const done = todos.filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))

  const row = (t: SeoTodo) => {
    const late = !t.done && !!t.due && t.due < today
    return (
      <li
        key={t.id}
        className={[
          'grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 rounded-lg border p-2.5',
          t.done
            ? 'border-[var(--a-e8dfd7)] bg-white opacity-60'
            : late
              ? 'border-[var(--a-a63d5a)] bg-[var(--a-f6e9ed)]'
              : 'border-[var(--a-e8dfd7)] bg-[var(--a-fbf8f5)]',
        ].join(' ')}
      >
        <input
          type="checkbox"
          checked={t.done}
          onChange={(e) => patch(t.id, { done: e.target.checked, doneAt: e.target.checked ? today : undefined })}
          aria-label={t.done ? '다시 열기' : '끝냄'}
          className="mt-1 h-4 w-4 accent-[var(--a-a63d5a)]"
        />
        <div className="min-w-0 space-y-1.5">
          <input
            value={t.text}
            onChange={(e) => patch(t.id, { text: e.target.value })}
            className={[
              'h-8 w-full rounded-md border border-transparent bg-transparent px-1 text-xs outline-none focus:border-[var(--a-d4c7be)] focus:bg-white',
              t.done ? 'line-through' : 'font-bold text-[var(--a-2e2724)]',
            ].join(' ')}
          />
          <div className="flex flex-wrap gap-2 text-[0.6875rem]">
            <label className="inline-flex items-center gap-1 text-[var(--a-8a7a72)]">
              누가
              <input
                value={t.who ?? ''}
                onChange={(e) => patch(t.id, { who: e.target.value })}
                placeholder="원장님"
                className="h-7 w-20 rounded-md border border-[var(--a-d4c7be)] bg-white px-1.5 text-xs outline-none focus:border-[var(--a-a63d5a)]"
              />
            </label>
            <label className={`inline-flex items-center gap-1 ${late ? 'font-bold text-[var(--a-a63d5a)]' : 'text-[var(--a-8a7a72)]'}`}>
              {late ? '기한 지남' : '기한'}
              <input
                value={t.due ?? ''}
                onChange={(e) => patch(t.id, { due: e.target.value })}
                placeholder="없음"
                className="h-7 w-24 rounded-md border border-[var(--a-d4c7be)] bg-white px-1.5 font-mono text-xs outline-none focus:border-[var(--a-a63d5a)]"
              />
            </label>
            <input
              value={t.note ?? ''}
              onChange={(e) => patch(t.id, { note: e.target.value })}
              placeholder="메모"
              className="h-7 min-w-0 flex-1 rounded-md border border-[var(--a-d4c7be)] bg-white px-1.5 text-xs outline-none focus:border-[var(--a-a63d5a)]"
            />
            {t.done && t.doneAt && <span className="self-center text-[var(--a-8a7a72)]">{t.doneAt} 끝</span>}
            <button
              onClick={() => {
                setTodos((x) => x.filter((y) => y.id !== t.id))
                setDirty(true)
              }}
              aria-label="지우기"
              className="inline-flex h-7 items-center rounded-md border border-[var(--a-d4c7be)] bg-white px-1.5 text-[var(--a-8a7a72)] hover:border-[var(--a-a63d5a)] hover:text-[var(--a-a63d5a)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </li>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--a-e0d6cc)] bg-white p-3.5 sm:p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-extrabold text-[var(--a-2e2724)]">SEO 할 일</h3>
        <span className="text-[0.6875rem] text-[var(--a-8a7a72)]">
          사이트 밖에서 해야 하는 것들 — 위 검색어 칸의 할 일은 사이트를 고치면 저절로 사라지지만 이건 끝냈다고 표시해야 합니다
        </span>
      </div>

      {open.length === 0 && done.length === 0 && (
        <p className="mt-3 text-[0.6875rem] text-[var(--a-8a7a72)]">아직 없습니다.</p>
      )}
      {open.length > 0 && <ul className="mt-3 space-y-2">{open.map(row)}</ul>}
      {done.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[0.6875rem] font-bold text-[var(--a-8a7a72)]">
            끝낸 것 {done.length}개
          </summary>
          <ul className="mt-2 space-y-2">{done.map(row)}</ul>
        </details>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setTodos((t) => [...t, { id: Math.random().toString(36).slice(2, 10), text: '', done: false }])
            setDirty(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--a-d4c7be)] px-3 py-2 text-xs font-bold text-[var(--a-6b5d57)]"
        >
          <Plus className="h-3.5 w-3.5" />
          할 일 추가
        </button>
        <button
          onClick={() => void save()}
          disabled={busy || !dirty}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--a-a63d5a)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          할 일 저장
        </button>
        {msg && (
          <span className={`text-xs ${msg.ok ? 'text-[var(--a-3f6b57)]' : 'text-[var(--a-a63d5a)]'}`}>{msg.text}</span>
        )}
        {dirty && !msg && <span className="text-[0.6875rem] text-[var(--a-8a7a72)]">저장하지 않은 변경이 있습니다</span>}
      </div>
    </div>
  )
}
