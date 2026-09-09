'use client'

import { useCallback, useEffect, useState } from 'react'
import { LogIn, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import AdminToolbar from '@/components/admin/AdminToolbar'
import { useAdminPrefs } from '@/components/admin/AdminTheme'
import { firebaseConfigured } from '@/lib/firebase/client'
import { ADMIN_EMAILS, signInAdmin, signOutAdmin, watchAdmin } from '@/lib/firebase/auth'

export type AdminMode = 'google'
export interface AdminCtx {
  /** 관리자 구글 로그인 계정 */
  email: string | null
  mode: AdminMode
  /**
   * @deprecated 비밀번호(8888) 로그인은 제거됐다. 항상 null 이며,
   * 서버도 더 이상 비밀번호를 받지 않는다. 호출부 정리용으로만 남겨둔다.
   */
  password: null
  /** DB 쓰기 가능 여부 — 저장은 서버 API 를 통해 이뤄진다 */
  canWrite: boolean
}

/**
 * 관리자 인증 게이트 — 관리자 Google 계정만 받는다.
 *
 * 비밀번호(8888) 로그인은 없앤다. 두 가지 이유다.
 *  1) Firestore 규칙이 로그인한 계정만 읽기/쓰기를 허용해서, 비밀번호로 들어오면
 *     목록이 통째로 비어 보인다 (Missing or insufficient permissions).
 *  2) 기본값이 공개 저장소에 그대로 적힌 8888 이라, 서버 저장 API 가 그대로 뒤렸다.
 */
export default function AdminGate({
  title,
  children,
}: {
  title: string
  children: (ctx: AdminCtx) => React.ReactNode
}) {
  const { font, setFont, theme, setTheme } = useAdminPrefs()
  const [email, setEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

  const login = useCallback(async () => {
    setErr(null)
    setBusy(true)
    try {
      const { email: e } = await signInAdmin()
      setEmail(e)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--a-8a7b73)]">
        확인 중…
      </div>
    )
  }

  if (email) {
    const mode: AdminMode = 'google'
    const canWrite = true
    return (
      <>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2 px-4 pt-4 text-xs lg:px-8">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-[var(--a-6b5d57)]">{email}</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[0.625rem] font-bold text-emerald-800">
            편집 가능
          </span>
          <button
            onClick={() => {
              void signOutAdmin()
              setEmail(null)
            }}
            className="underline text-[var(--a-8a7b73)] hover:text-[var(--a-a63d5a)]"
          >
            로그아웃
          </button>
        </div>
        <div className="mx-auto max-w-5xl px-5 pt-3">
          <AdminToolbar font={font} onFont={setFont} theme={theme} onTheme={setTheme} />
        </div>
        {children({ email, mode, password: null, canWrite })}
      </>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[var(--a-fbf7f3)] px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--a-e7ddd4)] bg-white p-8 shadow">
        <h1 className="text-lg font-extrabold text-[var(--a-2e2724)]">{title}</h1>

        {/* 관리자 구글 계정만 받는다 */}
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--a-8a7b73)]">
          아래 관리자 계정으로만 들어올 수 있습니다.
          <br />
          <span className="text-[var(--a-6b5d57)]">{ADMIN_EMAILS.join(', ')}</span>
        </p>
        <Button
          onClick={login}
          disabled={busy || !firebaseConfigured}
          className="mt-4 w-full bg-[var(--a-a63d5a)] hover:bg-[var(--a-8a2e48)]"
        >
          <LogIn className="mr-1.5 h-4 w-4" />
          {busy ? '로그인 중…' : 'Google 계정으로 로그인'}
        </Button>
        {!firebaseConfigured && (
          <p className="mt-2 text-[0.6875rem] leading-relaxed text-amber-700">
            Firebase가 아직 연결되지 않아 구글 로그인을 쓸 수 없습니다. (FIREBASE_SETUP.md 참고)
          </p>
        )}

        {err && <p className="mt-3 text-xs leading-relaxed text-red-600">{err}</p>}
      </div>
    </div>
  )
}
