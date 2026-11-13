'use client'

import { useCallback, useEffect, useState } from 'react'

import { useAdminAuth } from '@/components/admin/AdminAuth'
import { Note } from '@/components/admin/AdminUI'
import type { AdminView as View, AdminViews } from '@/lib/adminViews'

/** 지금 로그인한 계정의 idToken. 로그인 전이거나 Firebase 가 없으면 빈 문자열 */
export async function getIdToken(): Promise<string> {
  const { getFirebaseApp } = await import('@/lib/firebase/client')
  const app = getFirebaseApp()
  if (!app) return ''
  const { getAuth } = await import('firebase/auth')
  return (await getAuth(app).currentUser?.getIdToken()) ?? ''
}

/**
 * 로그인을 확인한 뒤에 서버에서 화면 값을 받아 온다.
 *
 * AdminGate 안쪽에 둔다. 게이트가 브라우저에서 문을 여닫는 것과 별개로, 값 자체는
 * /api/admin/view 가 idToken 을 다시 확인하고서야 내준다 — 게이트를 건너뛰고
 * 주소를 직접 불러도 401 이다. 서버 페이지가 props 로 넘기던 때는 HTML 에 값이
 * 함께 실려 와서, 게이트는 가리기만 했지 막지 못했다.
 *
 * 받는 동안과 실패했을 때를 따로 보인다. 빈 화면은 "자료가 없다" 로 읽혀서
 * 원장님이 장애를 사실로 받아들이게 된다.
 */
export default function AdminView<K extends View>({
  view,
  children,
}: {
  view: K
  children: (data: AdminViews[K]) => React.ReactNode
}) {
  const { email } = useAdminAuth()
  const [data, setData] = useState<AdminViews[K] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  // 오류 지우기는 여기서 한다 — 효과 안에서 setState 를 바로 부르면 렌더가 한 번 더 돈다
  const retry = useCallback(() => {
    setError(null)
    setTick((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!email) return
    let alive = true
    void (async () => {
      try {
        const res = await fetch('/api/admin/view', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ idToken: await getIdToken(), view }),
          cache: 'no-store',
        })
        const j = (await res.json().catch(() => null)) as
          | { ok: true; data: AdminViews[K] }
          | { ok: false; error?: string }
          | null
        if (!alive) return
        if (j?.ok) setData(j.data)
        else setError(j?.error ?? `불러오지 못했습니다 (HTTP ${res.status})`)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [email, view, tick])

  if (data) return <>{children(data)}</>
  if (error) {
    return (
      <Note kind="err">
        {error}{' '}
        <button type="button" className="font-bold underline" onClick={retry}>
          다시 불러오기
        </button>
      </Note>
    )
  }
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--a-8a7b73)]">
      불러오는 중…
    </div>
  )
}
