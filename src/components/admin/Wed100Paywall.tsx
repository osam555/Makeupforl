'use client'

import { useEffect, useState } from 'react'
import { Loader2, Lock, Save } from 'lucide-react'

import QuestionPicker from './QuestionPicker'
import { getDb } from '@/lib/firebase/client'
import type { Wed100Item } from '@/types/wed100'

/**
 * 100문100답 공개 범위.
 *
 * 잠금을 켜면 여기서 고른 문항만 본문과 음성이 열리고, 나머지는 제목과 안내만
 * 남는다. 잠긴 문항도 답변을 아예 내보내지 않을 뿐 페이지 자체는 열려 있어서
 * 검색에는 제목이 걸린다 — 그래야 사람이 찾아온다.
 */
export default function Wed100Paywall({
  items,
  auth,
}: {
  items: Wed100Item[]
  auth: () => Promise<{ idToken: string } | { password: string | null }>
}) {
  const [paywall, setPaywall] = useState(false)
  const [free, setFree] = useState<string[]>([])
  const [storeUrl, setStoreUrl] = useState('')
  const [notice, setNotice] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const db = getDb()
        if (db) {
          const { doc, getDoc } = await import('firebase/firestore')
          const snap = await getDoc(doc(db, 'site_config', 'wed100'))
          const d = snap.data() as
            | { paywall?: boolean; freeQna?: string[]; storeUrl?: string; notice?: string }
            | undefined
          if (d) {
            setPaywall(d.paywall === true)
            setFree(d.freeQna ?? [])
            setStoreUrl(d.storeUrl ?? '')
            setNotice(d.notice ?? '')
          }
        }
      } catch {
        /* 설정이 아직 없으면 열린 상태로 시작한다 */
      } finally {
        setLoaded(true)
      }
    })()
  }, [])

  const save = async () => {
    if (paywall && free.length === 0 && !confirm('무료 문항을 하나도 고르지 않았습니다.\n\n102개 전부가 잠깁니다. 계속할까요?'))
      return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/site/wed100', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(await auth()), paywall, freeQna: free, storeUrl, notice }),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setMsg({
        ok: true,
        text: paywall
          ? `저장했습니다. 무료 ${free.length}개 · 잠김 ${Math.max(0, items.length - free.length)}개`
          : '저장했습니다. 지금은 전 문항이 열려 있습니다.',
      })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  const locked = Math.max(0, items.length - free.length)

  return (
    <div className="rounded-xl border border-[#E0D6CC] bg-[#FBF8F5] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Lock className="h-4 w-4 text-[#8A7A72]" />
        <b className="text-sm text-[#3A322E]">공개 범위</b>
        <span className="text-xs text-[#8A7A72]">
          {paywall ? `무료 ${free.length}개 · 잠김 ${locked}개` : '전 문항 공개 중'}
        </span>
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
        <>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#E8DFD7] bg-white p-3">
            <input
              type="checkbox"
              checked={paywall}
              onChange={(e) => setPaywall(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-xs leading-relaxed text-[#3A322E]">
              <b>잠금 켜기</b> — 아래에서 고른 문항만 본문과 음성이 열립니다.
              <span className="mt-1 block text-[#8A7A72]">
                잠긴 문항도 페이지는 열려 있어 검색에는 제목이 걸립니다. 답변 글과 음성 주소는
                아예 내보내지 않으므로 소스 보기로도 읽히지 않습니다.
              </span>
            </span>
          </label>

          <div className="mt-3">
            <p className="mb-1.5 text-xs font-bold text-[#3A322E]">
              무료로 열 문항{' '}
              <span className="font-normal text-[#8A7A72]">
                — 잠긴 문항 화면에 &ldquo;지금 보실 수 있는 문항&rdquo;으로 앞의 5개가 함께 나옵니다
              </span>
            </p>
            <QuestionPicker items={items} value={free} onChange={setFree} ordered />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-[#3A322E]">구매 안내 주소</span>
              <input
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="https://smartstore.naver.com/..."
                className="mt-1 h-9 w-full rounded-md border border-[#D4C7BE] bg-white px-2.5 text-xs outline-none focus:border-[#A63D5A]"
              />
              <span className="mt-1 block text-[11px] text-[#8A7A72]">
                비워 두면 [전체 보기 신청] 버튼이 나오지 않습니다.
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[#3A322E]">잠긴 문항 안내 문구</span>
              <textarea
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                rows={2}
                placeholder="비우면 기본 문구가 나갑니다"
                className="mt-1 w-full rounded-md border border-[#D4C7BE] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#A63D5A]"
              />
            </label>
          </div>
        </>
      )}
    </div>
  )
}
