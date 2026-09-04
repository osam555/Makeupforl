'use client'

import { useEffect, useState } from 'react'
import { Home, Loader2, Save } from 'lucide-react'

import QuestionPicker from './QuestionPicker'
import { getDb } from '@/lib/firebase/client'
import type { Wed100Item } from '@/types/wed100'

const HERO_MAX = 8
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
  const [hero, setHero] = useState<string[]>([])
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
          const d = snap.data() as { heroQna?: string[]; sectionQna?: string[] } | undefined
          if (d?.heroQna) setHero(d.heroQna)
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
        body: JSON.stringify({ ...(await auth()), heroQna: hero, sectionQna: section }),
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
    <div className="rounded-xl border border-[#E0D6CC] bg-[#FBF8F5] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Home className="h-4 w-4 text-[#8A7A72]" />
        <b className="text-sm text-[#3A322E]">홈에 띄울 문항</b>
        <span className="text-xs text-[#8A7A72]">비워 두면 기본값이 나갑니다</span>
        <button
          onClick={() => void save()}
          disabled={busy || !loaded}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-md bg-[#221D1B] px-3 text-xs font-medium text-white hover:bg-[#3A322E] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          저장
        </button>
      </div>

      {msg && (
        <p className={`mt-2 text-xs ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p>
      )}

      {!loaded ? (
        <p className="mt-3 text-xs text-[#8A7A72]">불러오는 중…</p>
      ) : (
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-bold text-[#3A322E]">
              첫 화면 좌측 슬라이드{' '}
              <span className="font-normal text-[#8A7A72]">— 고른 순서대로 5초마다 돌아갑니다</span>
            </p>
            <QuestionPicker items={items} value={hero} onChange={setHero} max={HERO_MAX} ordered />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-bold text-[#3A322E]">
              홈 아래 100문100답 섹션{' '}
              <span className="font-normal text-[#8A7A72]">— 카드로 한 번에 펼쳐집니다</span>
            </p>
            <QuestionPicker items={items} value={section} onChange={setSection} max={SECTION_MAX} ordered />
          </div>
        </div>
      )}
    </div>
  )
}
