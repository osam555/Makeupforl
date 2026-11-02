'use client'

import { useState } from 'react'

/**
 * "이 기기에서 알림 받기" — 상담 신청 웹 푸시 구독.
 *
 * 원장님 휴대폰(안드로이드 크롬, 또는 홈 화면에 추가한 앱)에서 한 번 누르면 그 기기가
 * push_subs 에 남고, 상담 신청이 들어올 때마다 잠금화면 알림이 뜬다.
 * 브라우저가 알림을 못 받으면(아이폰 사파리 일반 탭 등) 단추 대신 이유를 보인다 —
 * 눌러도 아무 일 없는 단추가 제일 헷갈린다.
 */
function b64ToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export default function PushOptIn() {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const supported =
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  if (!supported) {
    // 무엇이 빠졌는지까지 적는다 — 카톡·네이버 인앱 브라우저나 시크릿 탭에서 열면 크롬처럼 보여도
    // 푸시가 없다(2026-10-30 갤럭시에서 "크롬에서 열라" 만 보고 원인을 못 찾았다)
    const nav = typeof navigator !== 'undefined' ? navigator : null
    const inApp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|; wv\)/i.test(nav?.userAgent ?? '')
    const missing = [
      !(nav && 'serviceWorker' in nav) && 'serviceWorker',
      !(typeof window !== 'undefined' && 'PushManager' in window) && 'PushManager',
      !(typeof window !== 'undefined' && 'Notification' in window) && 'Notification',
    ].filter(Boolean)
    return (
      <p className="text-xs text-[var(--a-8a7a72)]">
        이 브라우저는 알림을 받을 수 없습니다.{' '}
        {inApp
          ? '카톡·네이버 같은 앱 안에서 열렸습니다. 오른쪽 위 메뉴의 "다른 브라우저로 열기"로 크롬에서 열어 주세요.'
          : '크롬 앱에서 직접(시크릿 탭 말고) 열어 주세요.'}{' '}
        <span className="opacity-60">({missing.join(', ') || 'unknown'})</span>
      </p>
    )
  }
  if (!key) return <p className="text-xs text-[var(--a-8a7a72)]">알림 키(NEXT_PUBLIC_VAPID_PUBLIC_KEY)가 아직 설정되지 않았습니다.</p>

  async function subscribe(vapid: string) {
    setBusy(true)
    setMsg('')
    try {
      if ((await Notification.requestPermission()) !== 'granted') throw new Error('알림 허용이 꺼져 있습니다. 브라우저 설정에서 켜 주세요.')
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapid) }))
      const { getFirebaseApp } = await import('@/lib/firebase/client')
      const app = getFirebaseApp()
      const { getAuth } = await import('firebase/auth')
      const idToken = app ? await getAuth(app).currentUser?.getIdToken() : null
      const r = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken, sub: sub.toJSON() }),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) throw new Error(j.error ?? '저장하지 못했습니다.')
      setMsg('이 기기에서 상담 신청 알림을 받습니다.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => subscribe(key)}
        disabled={busy}
        className="rounded-lg bg-[var(--a-a63d5a)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
      >
        {busy ? '설정 중…' : '이 기기에서 알림 받기'}
      </button>
      {msg && <span className="text-xs text-[var(--a-6b5d57)]">{msg}</span>}
    </div>
  )
}
