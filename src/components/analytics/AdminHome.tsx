'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { watchAdmin } from '@/lib/firebase/auth'

/** 이번 실행에서 이미 보냈는지 — 앱을 닫았다 열면 다시 보낸다 */
const ONCE = 'mfl:adminHomeSent'

/**
 * 홈 화면 아이콘을 누르면 원장님께는 관리 화면이 열린다.
 *
 * 아이콘을 누르면 100문100답이 떴다. 앱을 담을 때 그 페이지에 계셨기 때문인데,
 * 매니페스트의 시작 주소를 고쳐도 이미 담긴 아이콘은 그대로다. 그래서 시작
 * 주소를 정하는 대신, 열린 자리에서 한 번 옮긴다.
 *
 * 시작 주소를 관리 화면으로 바꾸지 않은 이유는 앞서와 같다 — 이 앱을 담는 사람이
 * 원장님일 수도 손님일 수도 있어, 어느 한쪽으로 정하면 다른 쪽이 매번 되돌아
 * 나와야 한다. 대신 로그인된 계정을 보고 사람마다 다른 자리로 연다.
 *
 * 세 가지 조건을 다 만족할 때만 옮긴다.
 *  - 앱으로 열었을 때. 브라우저 주소창으로 들어온 것은 손대지 않는다.
 *  - 이번 실행에서 처음일 때. 안 그러면 앱 안에서 홈으로 갈 방법이 없어진다.
 *  - 관리자로 로그인돼 있을 때. 손님에게는 아무 일도 일어나지 않는다.
 */
export default function AdminHome() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // 앱으로 연 것이 아니면 아무것도 하지 않는다
    if (!window.matchMedia?.('(display-mode: standalone)').matches) return
    // 이미 관리 화면이면 옮길 곳이 없다
    if (pathname?.startsWith('/admin')) return

    try {
      if (sessionStorage.getItem(ONCE)) return
    } catch {
      /* 저장이 막혀 있으면 이번 한 번은 옮긴다 — 안 옮기는 것보다 낫다 */
    }

    let off: (() => void) | undefined
    void watchAdmin((email) => {
      if (!email) return
      try {
        sessionStorage.setItem(ONCE, '1')
      } catch {
        /* 못 남겨도 옮기기는 한다 */
      }
      router.replace('/admin')
    }).then((fn) => {
      off = fn
    })
    return () => off?.()
  }, [pathname, router])

  return null
}
