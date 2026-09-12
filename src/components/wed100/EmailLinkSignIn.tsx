'use client'

import { useEffect, useState } from 'react'
import { Loader2, Mail } from 'lucide-react'

import { completeEmailLink, sendEmailLink } from '@/lib/firebase/auth'

/**
 * 이메일 링크 로그인 — 구글 계정이 없는 손님을 위한 두 번째 문.
 *
 * 열리는 조건은 같다(명단에 있는 이메일). 로그인 수단만 다르다.
 * 링크를 누르면 이 페이지로 돌아오고, 그때 completeEmailLink 가 로그인을 마무리한다.
 * 로그인 상태는 부모가 watchUser 로 보고 있으므로 여기서는 결과를 돌려주지 않는다.
 */
export default function EmailLinkSignIn({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)

  /* 링크로 돌아온 경우 — 입력칸 대신 "확인 중" 을 보인다 */
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        if (!/[?&]oobCode=/.test(window.location.href)) return
        setFinishing(true)
        await completeEmailLink()
      } catch (e) {
        if (alive) setErr(friendly(e))
      } finally {
        if (alive) setFinishing(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const send = async () => {
    const v = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setErr('이메일 주소를 다시 확인해 주세요.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      // 링크는 지금 이 문항으로 돌아온다 — 목록으로 보내면 무엇을 보려던 건지 잊는다
      await sendEmailLink(v, window.location.href.split('#')[0])
      setSent(v)
    } catch (e) {
      setErr(friendly(e))
    } finally {
      setBusy(false)
    }
  }

  if (finishing) {
    return (
      <p className="inline-flex items-center gap-2 text-[13px] text-[var(--w-ink2)]">
        <Loader2 className="h-4 w-4 animate-spin" /> 로그인을 확인하고 있습니다…
      </p>
    )
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-[var(--w-line2)] bg-[var(--w-card)] p-4 text-[13px] leading-relaxed text-[var(--w-ink2)]">
        <b className="text-[var(--w-ink)]">{sent}</b> 로 로그인 링크를 보냈습니다.
        <br />
        받은 편지함에서 <b>&lsquo;메이크업포엘 로그인&rsquo;</b> 메일을 열고 링크를 눌러 주세요.
        안 보이면 스팸함도 봐 주세요. 링크는 한 번만 쓸 수 있습니다.
        <button
          type="button"
          onClick={() => setSent(null)}
          className="ml-2 underline underline-offset-2 hover:text-[var(--w-rose)]"
        >
          다른 주소로
        </button>
      </div>
    )
  }

  return (
    <div>
      {!compact && (
        <p className="text-[13px] leading-relaxed text-[var(--w-ink2)]">
          구글 계정이 없으시면 <b className="text-[var(--w-ink)]">신청하신 이메일</b>로 로그인 링크를 받으실 수 있습니다.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
        className="mt-2 flex max-w-[460px] flex-wrap gap-2"
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소 (naver.com 도 됩니다)"
          className="h-11 min-w-0 basis-full rounded-full border sm:basis-0 sm:flex-1 border-[var(--w-line)] bg-[var(--w-card)] px-4 text-[14px] text-[var(--w-ink)] outline-none placeholder:text-[var(--w-mut)] focus:border-[var(--w-rose)]"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--w-line)] bg-[var(--w-card)] px-4 text-[14px] font-bold text-[var(--w-ink)] transition-colors hover:border-[var(--w-rose)] hover:text-[var(--w-rose)] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          로그인 링크 받기
        </button>
      </form>
      {err && <p className="mt-2 text-[13px] text-[var(--w-rose-t)]">{err}</p>}
    </div>
  )
}

/** Firebase 오류 코드를 사람 말로 */
function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (/invalid-action-code|expired-action-code/.test(m))
    return '이 링크는 이미 쓰였거나 만료됐습니다. 링크를 다시 받아 주세요.'
  if (/invalid-email/.test(m)) return '이메일 주소를 다시 확인해 주세요.'
  if (/operation-not-allowed/.test(m))
    return '이메일 로그인이 아직 켜져 있지 않습니다. 02-323-3321 로 문의해 주세요.'
  if (/too-many-requests/.test(m)) return '잠시 후 다시 시도해 주세요.'
  return '메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
