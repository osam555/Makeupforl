'use client'

import { useCallback, useEffect, useState } from 'react'
import { KeyRound, LogIn, ShieldCheck, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { firebaseConfigured } from '@/lib/firebase/client'
import { ADMIN_EMAILS, signInAdmin, signOutAdmin, watchAdmin } from '@/lib/firebase/auth'

export type AdminMode = 'google' | 'password'
export interface AdminCtx {
  /** 구글 로그인 계정 (비밀번호 모드면 null) */
  email: string | null
  mode: AdminMode
  /** 비밀번호 로그인일 때 입력한 값 (서버 저장 API 인증에 사용) */
  password: string | null
  /** DB 쓰기 가능 여부 — 두 로그인 모두 서버 API 를 통해 저장한다 */
  canWrite: boolean
}

const PW = process.env.NEXT_PUBLIC_WED100_ADMIN_PASSWORD ?? '8888'

/**
 * 관리자 인증 게이트 — 두 가지 로그인을 병행 지원한다.
 *  1) 관리자 Google 계정 (makeupforl77@gmail.com) → 조회 + 저장 전부 가능
 *  2) 기존 비밀번호(8888)               → 화면 확인용. Firebase 연결 후에는 저장 불가
 */
export default function AdminGate({
  title,
  children,
}: {
  title: string
  children: (ctx: AdminCtx) => React.ReactNode
}) {
  const [email, setEmail] = useState<string | null>(null)
  const [pwOk, setPwOk] = useState(false)
  const [checking, setChecking] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pw, setPw] = useState('')

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
    const mode: AdminMode = email ? 'google' : 'password'
    const canWrite = true
    return (
      <>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2 px-4 pt-4 text-xs lg:px-8">
          {mode === 'google' ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[#6B5D57]">{email}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                편집 가능
              </span>
              <button
                onClick={() => {
                  void signOutAdmin()
                  setEmail(null)
                }}
                className="underline text-[#8A7B73] hover:text-[#A63D5A]"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <TriangleAlert className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-[#6B5D57]">비밀번호 로그인</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                편집 가능
              </span>
              <button
                onClick={() => setPwOk(false)}
                className="underline text-[#8A7B73] hover:text-[#A63D5A]"
              >
                나가기
              </button>
            </>
          )}
        </div>
        {children({ email, mode, password: pwOk ? pw : null, canWrite })}
      </>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#FBF7F3] px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-[#E7DDD4] bg-white p-8 shadow">
        <h1 className="text-lg font-extrabold text-[#2E2724]">{title}</h1>

        {/* 1) 관리자 구글 계정 */}
        <p className="mt-1.5 text-xs leading-relaxed text-[#8A7B73]">
          두 가지 방법 모두 편집·저장이 가능합니다.
          <br />
          <span className="text-[#6B5D57]">{ADMIN_EMAILS.join(', ')}</span>
        </p>
        <Button
          onClick={login}
          disabled={busy || !firebaseConfigured}
          className="mt-4 w-full bg-[#A63D5A] hover:bg-[#8A2E48]"
        >
          <LogIn className="mr-1.5 h-4 w-4" />
          {busy ? '로그인 중…' : 'Google 계정으로 로그인'}
        </Button>
        {!firebaseConfigured && (
          <p className="mt-2 text-[11px] leading-relaxed text-amber-700">
            Firebase가 아직 연결되지 않아 구글 로그인을 쓸 수 없습니다. (FIREBASE_SETUP.md 참고)
          </p>
        )}

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#E7DDD4]" />
          <span className="text-[10px] font-bold tracking-wider text-[#B3A69F]">또는</span>
          <span className="h-px flex-1 bg-[#E7DDD4]" />
        </div>

        {/* 2) 기존 비밀번호 (병행 유지) */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (pw === PW) {
              setErr(null)
              setPwOk(true)
            } else {
              setErr('비밀번호가 올바르지 않습니다.')
              setPw('')
            }
          }}
        >
          <label className="text-xs font-bold text-[#6B5D57]">관리자 비밀번호로 로그인</label>
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="mt-1.5"
            placeholder="관리자 비밀번호"
          />
          <Button type="submit" variant="outline" className="mt-2.5 w-full">
            <KeyRound className="mr-1.5 h-4 w-4" /> 비밀번호로 로그인
          </Button>
        </form>

        {err && <p className="mt-3 text-xs leading-relaxed text-red-600">{err}</p>}
      </div>
    </div>
  )
}
