'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, LogOut } from 'lucide-react'

import Wed100Locked from './Wed100Locked'
import Wed100Player, { type PlayerProps } from './Wed100Player'
import { signInUser, signOutUser, watchUser } from '@/lib/firebase/auth'

type LockedProps = React.ComponentProps<typeof Wed100Locked>

/**
 * 잠긴 문항의 문지기.
 *
 * 페이지 102개는 잠긴 모습 그대로 미리 구워 둔다. 서버에서 로그인 여부를 보고
 * 본문을 넣었다 뺐다 하면 사람마다 화면이 달라져 미리 구울 수 없고, 그러면
 * 애써 잡은 속도가 도로 무너진다. 그래서 본문만 따로 받아 채운다.
 *
 * 이미 로그인해 둔 사람은 버튼을 누르지 않아도 열려야 하므로, 화면에 들어오면
 * 조용히 한 번 확인한다. 권한이 없으면 잠긴 화면 그대로 두고 이유만 말해 준다.
 */
export default function Wed100Gate({
  slug,
  locked,
}: {
  slug: string
  locked: Omit<LockedProps, 'unlock'>
}) {
  const [player, setPlayer] = useState<PlayerProps | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [until, setUntil] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  // 로그인 상태 구독이 뜰 때마다 같은 요청을 두 번 보내지 않도록
  const tried = useRef<string | null>(null)

  const load = useCallback(
    async (idToken: string, loud: boolean) => {
      setBusy(true)
      if (loud) setMsg(null)
      try {
        const r = await fetch('/api/wed100/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, idToken }),
        })
        const d = await r.json().catch(() => ({}))
        if (r.ok && d?.ok) {
          setPlayer(d.player as PlayerProps)
          setUntil(typeof d.until === 'string' ? d.until : null)
          setMsg(null)
        } else if (loud || r.status === 403) {
          // 조용히 확인한 경우에도 "권한 없음"은 알려 줘야 한다.
          // 그래야 값을 낸 사람이 다른 계정으로 들어온 걸 알아챈다.
          setMsg(d?.error ?? '본문을 불러오지 못했습니다.')
        }
      } catch {
        if (loud) setMsg('연결이 고르지 않습니다. 잠시 후 다시 시도해 주세요.')
      } finally {
        setBusy(false)
      }
    },
    [slug],
  )

  useEffect(() => {
    let off = () => {}
    void watchUser((u) => {
      setEmail(u?.email ?? null)
      if (!u) {
        setPlayer(null)
        setUntil(null)
        tried.current = null
        return
      }
      if (tried.current === u.email) return
      tried.current = u.email
      void load(u.idToken, false)
    }).then((fn) => (off = fn))
    return () => off()
  }, [load])

  if (player)
    return (
      <>
        {/*
          언제까지 볼 수 있는지 알려 준다 — 끝나고 나서 알면 늦다.
          로그아웃도 여기 둔다. 열리고 나면 페이월을 안 그리므로, 이 자리가
          없으면 공용 컴퓨터에서 계정을 뺄 방법이 사라진다.
        */}
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full bg-[var(--w-rose-l)] px-4 py-2 text-[13px] text-[var(--w-rose-t)]">
          <b>전체 열람 중</b>
          {email && <span className="opacity-80">{email}</span>}
          {until && <span className="opacity-80">· {until} 까지</span>}
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="inline-flex items-center gap-1 underline-offset-2 opacity-80 hover:underline hover:opacity-100"
          >
            <LogOut className="h-3.5 w-3.5" />
            로그아웃
          </button>
        </div>
        <Wed100Player {...player} />
      </>
    )

  const signIn = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const { idToken } = await signInUser()
      await load(idToken, true)
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      // 사용자가 창을 닫은 것은 실패가 아니다
      setMsg(/popup-closed|cancelled-popup/.test(m) ? null : m)
      setBusy(false)
    }
  }

  return (
    <Wed100Locked
      {...locked}
      unlock={
        <div className="mt-5 border-t border-[var(--w-line2)] pt-5">
          {email ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[13px] text-[var(--w-ink2)]">
                <b className="text-[var(--w-ink)]">{email}</b> 로 로그인되어 있습니다.
              </p>
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--w-mut)] underline-offset-2 hover:underline"
              >
                <LogOut className="h-3.5 w-3.5" />
                다른 계정으로
              </button>
            </div>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-[var(--w-ink2)]">
                이미 전체 보기를 신청하셨다면, 신청하신 구글 계정으로 로그인하시면 바로 열립니다.
              </p>
              <button
                type="button"
                onClick={() => void signIn()}
                disabled={busy}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--w-line)] bg-[var(--w-card)] px-5 py-2.5 text-[14px] font-bold text-[var(--w-ink)] transition-colors hover:border-[var(--w-rose)] hover:text-[var(--w-rose)] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                구글 계정으로 로그인
              </button>
            </>
          )}

          {msg && (
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--w-rose-t)]">
              {msg}
              <br />
              <span className="text-[var(--w-mut)]">
                전체 보기를 신청하지 않으셨다면 02-323-3321 로 문의해 주세요.
              </span>
            </p>
          )}
        </div>
      }
    />
  )
}
