'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Home, RefreshCw } from 'lucide-react'

import AdminSettings from '@/components/admin/AdminSettings'
import AdminTabs from '@/components/admin/AdminTabs'
import { PendingBanner, PendingProvider } from '@/components/admin/Pending'
import { ADMIN_HOME_ONCE } from '@/components/analytics/AdminHome'

/**
 * 관리 화면의 껍데기 — 어느 화면이든 위쪽은 이것 하나다.
 *
 * 전에는 화면마다 제 나름의 껍데기가 있었다. 예약은 회색 바탕에 3xl 제목,
 * 통계는 검은 띠에 자기 새로고침과 자기 링크, 영상은 또 다른 회색. 같은 관리
 * 화면인데 넘어갈 때마다 다른 곳에 온 것 같았고, 어떤 화면에는 탭이 아예 없어
 * 길이 끊겼다.
 *
 * 더 큰 문제는 높이였다. 휴대전화로 열면 사이트 헤더 · 제목 · 탭 · 계정 ·
 * 글자크기 · 테마로 여섯 줄이 지나서야 첫 숫자가 나왔다. 매일 보는 값을 보려고
 * 매번 화면 반쯤을 넘겨야 했다.
 *
 * 그래서 두 줄로 줄인다. 위는 제목과 새로고침과 설정, 아래는 탭. 자주 만지지 않는
 * 것(글자 크기·테마·계정)은 설정 서랍에 접어 넣었다. 그리고 이 두 줄은 화면에
 * 붙여 둔다 — 100문100답처럼 긴 화면에서 다른 데로 가려면 맨 위까지 올라가야 했다.
 */
export default function AdminShell({
  active,
  title,
  wide,
  children,
}: {
  /** 지금 화면의 주소 — 탭에서 어디에 있는지 표시한다 */
  active: string
  title: string
  /** 표가 넓은 화면(100문100답·문항 통계)은 조금 더 넓게 쓴다 */
  wide?: boolean
  children: React.ReactNode
}) {
  const box = wide ? 'mx-auto w-full max-w-7xl px-3 sm:px-5' : 'mx-auto w-full max-w-5xl px-3 sm:px-5'

  /*
    윗줄의 높이를 안쪽에 알려 준다.

    화면 안에도 붙어 있는 줄이 있다 — 100문100답 편집기의 저장 도구줄이 그렇다.
    윗줄이 붙박이가 되면서 그 줄이 윗줄 뒤로 숨어 버렸다. 높이는 글자 크기에 따라
    달라지므로 값으로 적을 수 없다. 재서 --admin-top 에 담아 두면 안쪽에서
    그만큼 내려 붙일 수 있다.
  */
  const head = useRef<HTMLElement>(null)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = head.current
    const to = root.current
    if (!el || !to) return
    const ro = new ResizeObserver(() =>
      to.style.setProperty('--admin-top', `${el.offsetHeight}px`),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <PendingProvider>
    <div ref={root} className="min-h-screen pb-14">
      <header ref={head} className="sticky top-0 z-40 border-b border-[var(--a-e0d6cc)] bg-[var(--a-f4f1ee)]/95 backdrop-blur">
        <div className={box}>
          <div className="flex items-center gap-2 py-2">
            <Leave />
            <h1 className="min-w-0 flex-1 truncate text-sm font-extrabold text-[var(--a-2e2724)]">
              {title}
            </h1>
            <Reload />
            <AdminSettings />
          </div>
          <div className="pb-2">
            <AdminTabs active={active} />
          </div>
        </div>

        {/*
          결재 대기 띠.

          윗줄은 두 줄로 줄여 놓은 자리다. 여기에 세 번째 줄을 들이는 것은 그 원칙에
          어긋나지만, 결재할 것이 있을 때만 나타나고 결재하면 사라진다. 그리고 원장님이
          이걸 못 보시는 것이 이 기능이 실패하는 유일한 방식이다 — 결재함에 들어와야만
          알 수 있으면 결재함은 안 열린다. 붙박이 안에 두는 것도 같은 이유다.
          (윗줄 높이는 ResizeObserver 가 다시 재므로 안쪽 도구줄은 알아서 따라온다)
        */}
        <PendingBanner active={active} />
      </header>

      <main className={`${box} pt-4`}>{children}</main>
    </div>
    </PendingProvider>
  )
}

/**
 * 나가기 — 손님이 보는 화면으로.
 *
 * 관리 화면은 사이트 헤더를 벗겨 두었다(SiteShell). 그래서 한번 들어오면 탭에
 * 적힌 여섯 곳 말고는 갈 데가 없다. 나가려면 주소를 다시 치거나, 설정 서랍을 열어
 * [손님이 보는 사이트 열기] 를 눌러 창을 하나 더 띄워야 했다. 휴대전화 앱으로
 * 열면 주소창이 없어 앞의 방법은 아예 쓸 수 없다.
 *
 * 그래서 창을 새로 띄우지 않고 이 자리에서 홈으로 간다. 서랍 안의 링크는 컴퓨터에서
 * 관리 화면을 띄워 둔 채 사이트를 나란히 보려는 쓰임이라 그대로 둔다.
 *
 * 옮기기 전에 AdminHome 의 표식을 세운다 — 앱의 [관리 화면] 바로가기로 들어왔다면
 * 그 표식이 비어 있어서, 홈에 닿는 순간 관리 화면으로 되돌려 보내진다.
 */
function Leave() {
  return (
    <Link
      href="/"
      onClick={() => {
        try {
          sessionStorage.setItem(ADMIN_HOME_ONCE, '1')
        } catch {
          /* 저장이 막혀 있어도 나가기는 한다 */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--a-e0d6cc)] bg-[var(--color-white)] px-2.5 py-1.5 text-xs font-bold text-[var(--a-6b5d57)] hover:text-[var(--a-a63d5a)]"
    >
      <Home className="h-3.5 w-3.5" aria-hidden />
      나가기
    </Link>
  )
}

/**
 * 새로고침.
 *
 * 이 화면들은 열 때 한 번 값을 읽고 그대로 있다. 예약이 들어왔는지, 방금 고친
 * 문항이 반영됐는지 보려면 다시 읽어야 하는데, 휴대전화 앱으로 열면 주소창이
 * 없어 새로고침할 방법이 없었다. 설정 서랍에 넣지 않고 바깥에 남긴 이유다.
 */
function Reload() {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        setBusy(true)
        location.reload()
      }}
      disabled={busy}
      aria-label="새로고침"
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--a-e0d6cc)] bg-[var(--color-white)] px-2.5 py-1.5 text-xs font-bold text-[var(--a-6b5d57)] hover:text-[var(--a-a63d5a)] disabled:opacity-60"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} aria-hidden />
      <span className="hidden sm:inline">새로고침</span>
    </button>
  )
}
