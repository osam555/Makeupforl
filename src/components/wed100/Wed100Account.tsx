'use client'

import { useEffect, useState } from 'react'
import { Loader2, LogOut } from 'lucide-react'

import { signInUser, signOutUser, watchUser } from '@/lib/firebase/auth'

type Me = { email: string; allowed: boolean; until: string | null; expired: boolean }

/**
 * 전체 열람 로그인 자리.
 *
 * 값을 낸 분은 구매 랜딩에서 이 목록으로 넘어온다. 그런데 로그인 버튼이
 * 잠긴 문항 안에만 있으면, 목록에 도착한 사람은 어디를 눌러야 할지 모른다.
 * 문 앞에 열쇠 구멍을 둔다.
 *
 * 열람 중일 때도 계속 보여 준다 — 로그아웃할 자리가 없으면 공용 컴퓨터에서
 * 계정을 뺄 방법이 없다.
 */
export default function Wed100Account() {
  const [me, setMe] = useState<Me | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const check = async (idToken: string) => {
    try {
      const r = await fetch('/api/wed100/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const d = await r.json().catch(() => null)
      setMe(d?.ok ? (d as Me) : null)
    } catch {
      setMe(null)
    }
  }

  useEffect(() => {
    let off = () => {}
    void watchUser((u) => {
      setReady(true)
      if (!u) return setMe(null)
      void check(u.idToken)
    }).then((fn) => (off = fn))
    return () => off()
  }, [])

  const signIn = async () => {
    setBusy(true)
    setErr(null)
    try {
      const { idToken } = await signInUser()
      await check(idToken)
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      setErr(/popup-closed|cancelled-popup/.test(m) ? null : m)
    } finally {
      setBusy(false)
    }
  }

  // 로그인 상태를 확인하기 전에는 아무것도 그리지 않는다.
  // 잠깐 "로그인하세요"가 떴다가 사라지면 값을 낸 분이 놀란다.
  if (!ready) return null

  if (me?.allowed) {
    return (
      <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-full border border-[var(--w-line)] bg-[var(--w-card)] px-5 py-2.5 text-[13px]">
        <span className="font-bold text-[var(--w-rose)]">전체 열람 중</span>
        <span className="text-[var(--w-ink2)]">{me.email}</span>
        {me.until && <span className="text-[var(--w-mut)]">· {me.until} 까지</span>}
        <button
          type="button"
          onClick={() => void signOutUser()}
          className="inline-flex items-center gap-1 text-[var(--w-mut)] underline-offset-2 hover:text-[var(--w-rose)] hover:underline"
        >
          <LogOut className="h-3.5 w-3.5" />
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-[var(--w-line)] bg-[var(--w-card)] px-5 py-4 text-center">
      {me?.expired ? (
        <p className="text-[13.5px] leading-relaxed text-[var(--w-ink2)]">
          <b className="text-[var(--w-ink)]">{me.email}</b> 의 열람 기간이{' '}
          <b className="text-[var(--w-rose)]">{me.until}</b> 로 끝났습니다.
          <br />
          <span className="text-[var(--w-mut)]">
            연장은 02-323-3321 로 문의해 주세요.
          </span>
        </p>
      ) : me ? (
        <p className="text-[13.5px] leading-relaxed text-[var(--w-ink2)]">
          <b className="text-[var(--w-ink)]">{me.email}</b> 계정에는 아직 전체 열람 권한이 없습니다.
          <br />
          <span className="text-[var(--w-mut)]">
            신청하신 계정이 따로 있다면 그 계정으로 다시 로그인해 주세요.
          </span>
        </p>
      ) : (
        <p className="text-[13.5px] leading-relaxed text-[var(--w-ink2)]">
          전체 보기를 신청하셨나요? <b className="text-[var(--w-ink)]">신청하신 구글 계정</b>으로
          로그인하시면 100문 100답이 전부 열립니다.
        </p>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => void signIn()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--w-line)] px-5 py-2.5 text-[13.5px] font-bold text-[var(--w-ink)] transition-colors hover:border-[var(--w-rose)] hover:text-[var(--w-rose)] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {me ? '다른 구글 계정으로 로그인' : '구글 계정으로 로그인'}
        </button>
        {me && (
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13.5px] font-semibold text-[var(--w-mut)] hover:text-[var(--w-rose)]"
          >
            <LogOut className="h-3.5 w-3.5" />
            로그아웃
          </button>
        )}
      </div>

      {err && <p className="mt-2 text-[13px] text-[var(--w-rose-t)]">{err}</p>}
    </div>
  )
}
