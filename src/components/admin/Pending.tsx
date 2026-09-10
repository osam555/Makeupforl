'use client'

import Link from 'next/link'
import { createContext, useContext, useEffect, useState } from 'react'
import { Stamp } from 'lucide-react'

import { useAdminAuth } from '@/components/admin/AdminAuth'
import { pendingOf, unseenOf, type Proposal } from '@/lib/proposals'
import { isOwner } from '@/lib/roles'

/**
 * 결재 대기 건수를 관리 화면 전체가 함께 본다.
 *
 * 알림톡을 붙일 수도 있었지만(채널 개설·템플릿 심사에 한두 주가 든다) 결국
 * 원장님이 결재하려면 어드민에 들어오셔야 한다. 그러니 **들어오셨을 때 놓칠 수
 * 없게** 만드는 편이 먼저다. 탭에 숫자를 달고, 어느 화면에 계시든 윗줄 아래에
 * 띠를 하나 띄운다 — 결재함에 들어와야만 알 수 있으면 결재함은 안 열린다.
 *
 * 한 번만 읽는다. 여러 화면에서 각자 읽으면 화면을 옮길 때마다 같은 것을 다시
 * 묻게 된다. 결재는 초 단위로 바뀌는 값이 아니라 화면을 새로 열 때 맞으면 된다.
 */
interface Pending {
  /** 결재를 기다리는 제안 */
  count: number
  /**
   * 결재가 끝났는데 내가 아직 확인하지 않은 것.
   *
   * 대기 건수만 세면 반쪽이다. 원장님이 승인하셔도 올린 사람이 모르면 아무 일도
   * 일어나지 않고, 반려는 더 나쁘다 — 왜 안 됐는지 모른 채 기다리게 된다.
   */
  results: number
  /** 지금 보는 사람이 결재권자인가 — 말투를 바꾸는 데 쓴다 */
  owner: boolean
}

const Ctx = createContext<Pending>({ count: 0, results: 0, owner: false })

export function usePending(): Pending {
  return useContext(Ctx)
}

export function PendingProvider({ children }: { children: React.ReactNode }) {
  const { email } = useAdminAuth()
  const [count, setCount] = useState(0)
  const [results, setResults] = useState(0)

  useEffect(() => {
    if (!email) {
      setCount(0)
      setResults(0)
      return
    }
    let alive = true
    void (async () => {
      try {
        const { getFirebaseApp } = await import('@/lib/firebase/client')
        const app = getFirebaseApp()
        if (!app) return
        const { getAuth } = await import('firebase/auth')
        const idToken = (await getAuth(app).currentUser?.getIdToken()) ?? ''
        if (!idToken) return
        const res = await fetch('/api/proposals', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ idToken, action: 'list' }),
        })
        const json = await res.json().catch(() => null)
        if (!alive || !json?.ok) return
        const items = json.items as Proposal[]
        setCount(pendingOf(items).length)
        setResults(unseenOf(items, email).length)
      } catch {
        /* 건수를 못 읽어도 관리 화면은 열려야 한다 */
      }
    })()
    return () => {
      alive = false
    }
  }, [email])

  return (
    <Ctx.Provider value={{ count, results, owner: isOwner(email) }}>{children}</Ctx.Provider>
  )
}

/**
 * 결재 대기 띠.
 *
 * 원장님께는 "정해 주세요", 매니저에게는 "기다리는 중" 이다. 같은 숫자라도
 * 한쪽에는 할 일이고 다른 쪽에는 상태다.
 */
export function PendingBanner({ active }: { active: string }) {
  const { count, results, owner } = usePending()
  if (active === '/admin/proposals') return null

  /*
    둘이 겹칠 때는 결재 결과를 앞세운다.

    원장님께는 대기가 할 일이지만, 매니저에게 급한 것은 "내가 올린 것이 어떻게
    됐는가" 다. 승인이 났으면 배포하거나 확인할 일이 생기고, 반려면 고쳐 다시
    올려야 한다. 대기 건수는 그동안 그 자리에 그대로 있다.
  */
  if (results > 0) {
    return (
      <Link
        href="/admin/proposals"
        className="flex items-center gap-2 bg-[var(--a-3f6b57)] px-3 py-2.5 text-sm font-bold text-white sm:px-5"
      >
        <Stamp className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">올리신 제안 {results}건이 결재됐습니다</span>
        <span className="shrink-0 text-xs opacity-80">확인 →</span>
      </Link>
    )
  }

  if (count < 1) return null

  return (
    <Link
      href="/admin/proposals"
      className={[
        'flex items-center gap-2 px-3 py-2.5 text-sm font-bold sm:px-5',
        owner
          ? 'bg-[var(--a-a63d5a)] text-white'
          : 'bg-[var(--a-f6e9ed)] text-[var(--a-8a2e48)]',
      ].join(' ')}
    >
      <Stamp className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {owner
          ? `결재해 주실 제안이 ${count}건 있습니다`
          : `올린 제안 ${count}건이 결재를 기다리고 있습니다`}
      </span>
      <span className="shrink-0 text-xs opacity-80">보기 →</span>
    </Link>
  )
}
