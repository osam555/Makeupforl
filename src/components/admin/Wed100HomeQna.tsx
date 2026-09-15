'use client'

import { useEffect, useState } from 'react'
import { Home, Loader2, Save } from 'lucide-react'

import QuestionPicker from './QuestionPicker'
import { getDb } from '@/lib/firebase/client'
import type { Wed100Item } from '@/types/wed100'

const SECTION_MAX = 12

/**
 * 홈에 띄울 100문100답 문항 고르기.
 *
 * 어느 질문을 앞에 세울지는 계절과 상담 흐름에 따라 바뀐다. 코드에 박아 두면
 * 그때마다 개발자를 거쳐야 해서 여기서 직접 고르게 한다.
 */
export default function Wed100HomeQna({
  items,
  auth,
}: {
  items: Wed100Item[]
  auth: () => Promise<{ idToken: string } | { password: string | null }>
}) {
  const [section, setSection] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const db = getDb()
        if (db) {
          const { doc, getDoc } = await import('firebase/firestore')
          const snap = await getDoc(doc(db, 'site_config', 'home'))
          const d = snap.data() as { sectionQna?: string[] } | undefined
          if (d?.sectionQna) setSection(d.sectionQna)
        }
      } catch {
        /* 설정이 아직 없으면 빈 상태로 시작한다 */
      } finally {
        setLoaded(true)
      }
    })()
  }, [])

  const save = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/site/home', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(await auth()), sectionQna: section }),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setMsg({ ok: true, text: '저장했습니다. 홈에 바로 반영됩니다.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--a-e0d6cc)] bg-[var(--a-fbf8f5)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Home className="h-4 w-4 text-[var(--a-8a7a72)]" />
        <b className="text-sm text-[var(--a-3a322e)]">홈에 띄울 문항</b>
        <span className="text-xs text-[var(--a-8a7a72)]">비워 두면 기본값이 나갑니다</span>
        <button
          onClick={() => void save()}
          disabled={busy || !loaded}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-md bg-[var(--a-221d1b)] px-3 text-xs font-medium text-white hover:bg-[var(--a-3a322e)] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          저장
        </button>
      </div>

      {msg && (
        <p className={`mt-2 text-xs ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p>
      )}

      {!loaded ? (
        <p className="mt-3 text-xs text-[var(--a-8a7a72)]">불러오는 중…</p>
      ) : (
        <div className="mt-3">
          {/*
            첫 화면 슬라이드 선택 칸은 없앴다(2026-09-15).

            "무료로 열 문항" 과 따로 골라야 해서 두 목록이 어긋났다 — 홈 첫 화면에
            잠긴 문항이 뜨거나, 무료로 바꾼 문항이 홈에 안 뜨거나. 이제 첫 화면
            슬라이드는 무료 문항을 그대로 따르므로, 고르는 곳은 아래 "공개 범위 →
            무료로 열 문항" 한 곳이다.
          */}
          <div className="mb-3 rounded-lg border border-[var(--a-e8dfd7)] bg-white px-3 py-2.5 text-xs leading-relaxed text-[var(--a-6b5d57)]">
            <b className="text-[var(--a-3a322e)]">첫 화면 좌측 슬라이드</b>는 아래{' '}
            <b className="text-[var(--a-a63d5a)]">공개 범위 → 무료로 열 문항</b>을 그대로 따라 돕니다.
            여기서 따로 고르지 않아도 됩니다 — 무료 문항을 바꾸면 홈 첫 화면도 함께 바뀝니다.
          </div>
          <p className="mb-1.5 text-xs font-bold text-[var(--a-3a322e)]">
            홈 아래 100문100답 섹션{' '}
            <span className="font-normal text-[var(--a-8a7a72)]">— 카드로 한 번에 펼쳐집니다</span>
          </p>
          <QuestionPicker items={items} value={section} onChange={setSection} max={SECTION_MAX} ordered />
        </div>
      )}
    </div>
  )
}
