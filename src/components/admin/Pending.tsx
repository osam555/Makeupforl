'use client'

import Link from 'next/link'
import { createContext, useContext, useEffect, useState } from 'react'
import { Stamp } from 'lucide-react'

import { useAdminAuth } from '@/components/admin/AdminAuth'
import { pendingOf, type Proposal } from '@/lib/proposals'
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
  count: number
  /** 지금 보는 사람이 결재권자인가 — 말투를 바꾸는 데 쓴다 */
  owner: boolean
}

const Ctx = createContext<Pending>({ count: 0, owner: false })

export function usePending(): Pending {
  return useContext(Ctx)
}

export function PendingProvider({ children }: { children: React.ReactNode }) {
  const { email } = useAdminAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!email) {
      setCount(0)
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
        setCount(pendingOf(json.items as Proposal[]).length)
      } catch {
        /* 건수를 못 읽어도 관리 화면은 열려야 한다 */
      }
    })()
    return () => {
      alive = false
    }
  }, [email])

  return <Ctx.Provider value={{ count, owner: isOwner(email) }}>{children}</Ctx.Provider>
}

/**
 * 결재 대기 띠.
 *
 * 원장님께는 "정해 주세요", 매니저에게는 "기다리는 중" 이다. 같은 숫자라도
 * 한쪽에는 할 일이고 다른 쪽에는 상태다.
 */
export function PendingBanner({ active }: { active: string }) {
  const { count, owner } = usePending()
  if (count < 1 || active === '/admin/proposals') return null

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
