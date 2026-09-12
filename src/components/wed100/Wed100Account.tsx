'use client'

import { useEffect, useState } from 'react'
import { Loader2, LogOut } from 'lucide-react'

import { signInUser, signOutUser, watchUser } from '@/lib/firebase/auth'

import EmailLinkSignIn from './EmailLinkSignIn'

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

  /*
    확인이 끝나기 전에는 로그인 안내를 먼저 보여 준다.

    처음에는 상태를 알기 전까지 아무것도 안 그렸다. 그러면 서버가 보내는
    HTML 에 이 자리가 통째로 비어, 구매 랜딩에서 막 넘어온 분이 도착했을 때
    화면에 열쇠 구멍이 없다. 이미 로그인한 분이 잠깐 안내를 보는 쪽이,
    값을 낸 분이 로그인할 데를 못 찾는 쪽보다 낫다.
  */

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
          전체 보기를 신청하셨나요? <b className="text-[var(--w-ink)]">신청하신 계정</b>으로
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

      {!me && (
        <div className="mx-auto mt-4 max-w-[440px] text-left">
          <EmailLinkSignIn compact />
          <p className="mt-1.5 text-[12px] text-[var(--w-mut)]">구글 계정이 없으시면 신청하신 이메일로 로그인 링크를 받으세요.</p>
        </div>
      )}
    </div>
  )
}
