'use client'

import { useEffect } from 'react'

/**
 * 서비스 워커 등록.
 *
 * 관리 화면에서는 등록하지 않는다. 관리자가 저장한 직후에 옛 화면을 보게 되는 일이
 * 가장 헷갈리고, 그 화면은 오프라인으로 쓸 일도 없다.
 */
export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (location.pathname.startsWith('/admin')) return
    const t = setTimeout(() => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }, 2000) // 첫 화면이 다 그려진 뒤에 등록한다 — 등록이 그리기를 늦추면 안 된다
    return () => clearTimeout(t)
  }, [])
  return null
}
