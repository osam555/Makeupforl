'use client'

import { useCallback, useEffect, useState } from 'react'
import { LogIn, ShieldCheck, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { firebaseConfigured } from '@/lib/firebase/client'
import { ADMIN_EMAILS, signInAdmin, signOutAdmin, watchAdmin } from '@/lib/firebase/auth'

/**
 * 관리자 인증 게이트.
 * - Firebase 연결됨  → 관리자 Google 계정 로그인 (허용 목록: NEXT_PUBLIC_ADMIN_EMAILS)
 * - Firebase 미연결   → 비밀번호 게이트로 폴백 (읽기전용 미리보기 용도)
 */
export default function AdminGate({
  title,
  children,
}: {
  title: string
  children: (ctx: { email: string | null }) => React.ReactNode
}) {
  const [email, setEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // 폴백(비밀번호) 경로
  const [pw, setPw] = useState('')
  const [pwOk, setPwOk] = useState(false)
  const FALLBACK_PW = process.env.NEXT_PUBLIC_WED100_ADMIN_PASSWORD ?? '8888'

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
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[#8A7B73]">
        확인 중…
      </div>
    )
  }

  if (email || pwOk) {
    return (
      <>
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 pt-4 text-xs text-[#8A7B73] lg:px-8">
          {email ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>{email}</span>
              <button
                onClick={() => {
                  void signOutAdmin()
                  setEmail(null)
                }}
                className="underline hover:text-[#A63D5A]"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <TriangleAlert className="h-3.5 w-3.5 text-amber-600" />
              <span>Firebase 미연결 — 읽기전용 미리보기</span>
              <button onClick={() => setPwOk(false)} className="underline hover:text-[#A63D5A]">
                나가기
              </button>
            </>
          )}
        </div>
        {children({ email })}
      </>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#FBF7F3] px-6">
      <div className="w-full max-w-sm rounded-2xl border border-[#E7DDD4] bg-white p-8 shadow">
        <h1 className="text-lg font-extrabold text-[#2E2724]">{title}</h1>

        {firebaseConfigured ? (
          <>
            <p className="mt-1.5 text-xs leading-relaxed text-[#8A7B73]">
              관리자 계정으로 로그인하세요.
              <br />
              허용 계정: {ADMIN_EMAILS.join(', ')}
            </p>
            <Button
              onClick={login}
              disabled={busy}
              className="mt-5 w-full bg-[#A63D5A] hover:bg-[#8A2E48]"
            >
              <LogIn className="mr-1.5 h-4 w-4" />
              {busy ? '로그인 중…' : 'Google 계정으로 로그인'}
            </Button>
            {err && <p className="mt-3 text-xs leading-relaxed text-red-600">{err}</p>}
          </>
        ) : (
          <>
            <p className="mt-1.5 text-xs leading-relaxed text-amber-700">
              Firebase가 아직 연결되지 않았습니다. 연결 전에는 내용을 저장할 수 없고 화면만 확인할 수
              있습니다. (FIREBASE_SETUP.md 참고)
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (pw === FALLBACK_PW) setPwOk(true)
                else {
                  setErr('비밀번호가 올바르지 않습니다.')
                  setPw('')
                }
              }}
            >
              <Input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="mt-4"
                placeholder="임시 비밀번호"
              />
              <Button type="submit" className="mt-3 w-full bg-[#A63D5A] hover:bg-[#8A2E48]">
                미리보기로 열기
              </Button>
            </form>
            {err && <p className="mt-3 text-xs text-red-600">{err}</p>}
          </>
        )}
      </div>
    </div>
  )
}
