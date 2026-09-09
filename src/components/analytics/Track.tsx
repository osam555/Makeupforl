'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

const SID = 'mfl:sid'

/**
 * 방문 기록기.
 *
 * 사람을 식별하지 않는다. 쿠키를 쓰지 않고, 세션 구분은 sessionStorage 에 넣는 임의
 * 문자열로만 한다 — 창을 닫으면 사라지고 우리는 그 값이 누구인지 알 수 없다.
 *
 * 나갈 때 머문 시간을 보낸다. 페이지를 떠나는 순간에는 보통의 요청이 끊기므로
 * sendBeacon 을 쓴다. 브라우저가 받아 두었다가 나중에 보내 준다.
 *
 * visibilitychange 로 보내는 이유: 모바일에서는 창을 닫아도 unload 가 안 오는 일이
 * 많다. 화면이 가려지는 순간이 실제로 떠난 시점에 가장 가깝다.
 */
export default function Track() {
  const pathname = usePathname()
  const startedAt = useRef(0)
  const sent = useRef(false)

  useEffect(() => {
    if (!pathname) return

    let isNew = false
    try {
      if (!sessionStorage.getItem(SID)) {
        sessionStorage.setItem(SID, Math.random().toString(36).slice(2))
        isNew = true
      }
    } catch {
      /* 저장이 막혀 있어도 기록은 보낸다 — 다만 방문 수는 세지 않는다 */
    }

    startedAt.current = Date.now()
    sent.current = false

    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        path: pathname,
        kind: 'view',
        newSession: isNew,
        ref: isNew ? document.referrer : '',
      }),
    }).catch(() => {})

    const leave = () => {
      if (sent.current) return
      const dwellMs = Date.now() - startedAt.current
      if (dwellMs < 1000) return
      sent.current = true
      const payload = JSON.stringify({ path: pathname, kind: 'leave', dwellMs })
      try {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))
      } catch {
        void fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: payload,
        }).catch(() => {})
      }
    }

    const onHidden = () => {
      if (document.visibilityState === 'hidden') leave()
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', leave)

    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', leave)
      // 사이트 안에서 다른 쪽으로 넘어갈 때도 머문 시간은 남긴다
      leave()
    }
  }, [pathname])

  return null
}
