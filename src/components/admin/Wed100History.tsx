'use client'

import { useCallback, useEffect, useState } from 'react'
import { History, Loader2, Undo2 } from 'lucide-react'

type Version = {
  id: string
  savedAt: string
  editor: string
  fields: string[]
  question: string
}

const when = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * 문항 수정 이력.
 *
 * 저장은 덮어쓰기라 이전 내용이 남지 않았다. 잘못 고치면 되돌릴 방법이 없어,
 * 손대기가 무서운 화면이 된다. 고치기 직전 상태를 한 벌씩 떠 두고 여기서
 * 날짜별로 보고 되돌린다.
 *
 * 되돌리기도 수정이므로 되돌리기 직전 상태가 또 한 벌 남는다 — 되돌렸는데
 * 그게 더 나빴던 경우에도 다시 앞으로 갈 수 있다.
 */
export default function Wed100History({
  slug,
  question,
  auth,
  onReverted,
}: {
  slug: string
  question: string
  auth: () => Promise<{ idToken: string } | { password: string | null }>
  onReverted?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<Version[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setVersions(null)
    setMsg(null)
    try {
      const r = await fetch('/api/wed100/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(await auth()), action: 'history', slug }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setVersions(j.versions as Version[])
    } catch (e) {
      setVersions([])
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    }
  }, [auth, slug])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  // 문항을 바꾸면 열려 있던 이력은 다른 문항 것이라 닫는다
  useEffect(() => {
    setOpen(false)
    setVersions(null)
    setMsg(null)
  }, [slug])

  const revert = async (v: Version) => {
    if (
      !confirm(
        `${when(v.savedAt)} 판으로 되돌립니다.\n\n  ${v.question}\n\n` +
          '지금 내용은 이력에 남으므로 다시 앞으로 갈 수 있습니다. 계속할까요?',
      )
    )
      return
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/wed100/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(await auth()), action: 'revert', id: v.id }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setMsg({ ok: true, text: `${when(v.savedAt)} 판으로 되돌렸습니다.` })
      await load()
      onReverted?.()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--a-e0d6cc)] bg-[var(--a-fbf8f5)] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-xs font-bold text-[var(--a-3a322e)]"
      >
        <History className="h-3.5 w-3.5" />
        수정 이력
        <span className="font-normal text-[var(--a-8a7a72)]">
          {versions === null ? '' : `${versions.length}개 판`}
        </span>
        <span className="ml-auto text-[var(--a-8a7a72)]">{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>

      {open && (
        <div className="mt-3">
          {versions === null ? (
            <p className="flex items-center gap-2 py-4 text-xs text-[var(--a-8a7a72)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              불러오는 중…
            </p>
          ) : versions.length === 0 ? (
            <p className="py-4 text-xs leading-relaxed text-[var(--a-8a7a72)]">
              아직 남은 판이 없습니다. 이 문항을 처음 고치는 순간부터 직전 내용이 여기에 쌓입니다.
              <br />
              지금 내용: <b className="text-[var(--a-3a322e)]">{question}</b>
            </p>
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[var(--a-e7ddd4)] bg-white px-3 py-2.5"
                >
                  <span className="font-mono text-[0.6875rem] text-[var(--a-8a7a72)]">{when(v.savedAt)}</span>
                  <span className="flex-1 text-[0.7812rem] leading-snug text-[var(--a-2e2724)]">
                    {v.question}
                  </span>
                  <span className="text-[0.6875rem] text-[var(--a-8a7a72)]">
                    {v.fields.join(', ')} · {v.editor}
                  </span>
                  <button
                    type="button"
                    onClick={() => void revert(v)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--a-d4c7be)] px-2.5 py-1 text-[0.6875rem] font-bold text-[var(--a-3a322e)] hover:border-[var(--a-a63d5a)] hover:text-[var(--a-a63d5a)] disabled:opacity-50"
                  >
                    <Undo2 className="h-3 w-3" />
                    이 판으로
                  </button>
                </li>
              ))}
            </ul>
          )}

          {msg && (
            <p className={`mt-2 text-xs ${msg.ok ? 'text-[var(--a-3f6b57)]' : 'text-[var(--a-a63d5a)]'}`}>
              {msg.text}
            </p>
          )}
          <p className="mt-2 text-[0.6875rem] leading-relaxed text-[var(--a-8a7a72)]">
            문항마다 최근 20개 판까지 보관합니다. 되돌리기도 수정이라 되돌리기 직전 내용이 한 벌
            더 남습니다.
          </p>
        </div>
      )}
    </div>
  )
}
