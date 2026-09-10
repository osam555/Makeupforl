'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { signInAdmin, signOutAdmin, watchAdmin } from '@/lib/firebase/auth'

export interface AdminAuth {
  /** 로그인한 관리자 계정. 아직 확인 중이거나 로그인 전이면 null */
  email: string | null
  /** 첫 확인이 끝났는가 — 끝나기 전에 로그인 화면을 보이면 깜박인다 */
  checking: boolean
  busy: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
}

const Ctx = createContext<AdminAuth | null>(null)

export function useAdminAuth(): AdminAuth {
  const v = useContext(Ctx)
  if (!v) throw new Error('AdminAuthProvider 안에서만 쓸 수 있습니다')
  return v
}

/**
 * 로그인 상태를 관리 화면 전체가 함께 본다.
 *
 * 전에는 게이트(AdminGate)가 혼자 들고 있었다. 그래서 계정 이름과 로그아웃 단추가
 * 게이트 안쪽, 곧 제목과 탭 아래에 따로 한 줄로 놓였다 — 화면 위쪽이 제목·탭·계정·
 * 글자크기·테마로 다섯 줄이 되어 버린 이유가 이것이다.
 *
 * 상태를 위로 올리면 윗줄(AdminShell)이 계정을 알 수 있고, 계정과 설정을 한 자리에
 * 모을 수 있다. 게이트는 "로그인했는가" 만 보고 문을 여닫는 일만 한다.
 */
export default function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let off: (() => void) | undefined
    void watchAdmin((e) => {
      setEmail(e)
      setChecking(false)
    }).then((fn) => {
      off = fn
    })
    return () => off?.()
  }, [])

  const signIn = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      const { email: e } = await signInAdmin()
      setEmail(e)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const signOut = useCallback(() => {
    void signOutAdmin()
    setEmail(null)
  }, [])

  return (
    <Ctx.Provider value={{ email, checking, busy, error, signIn, signOut }}>{children}</Ctx.Provider>
  )
}
