'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

/**
 * 어드민 탭.
 *
 * 화면이 여섯으로 늘면서 서로 오갈 길이 제각각이었다 — 어떤 화면에는 링크가 있고
 * 어떤 화면에는 없었다(예약 화면에는 아예 없었다). 한 줄로 모아 어디서든 같은
 * 자리에 둔다.
 *
 * 검색어를 앞에 둔 것은, 매일 볼 값이 그쪽이기 때문이다. 예약과 콘텐츠는
 * 일이 생겼을 때 들어가는 화면이지만 검색어와 방문은 흐름을 보는 화면이다.
 *
 * 결재가 붙어 일곱이 되면서 좁은 화면에 들어가는 칸이 줄었다. 항목 사이 여백을
 * 반으로 줄인다 — 칸 사이 gap 만 줄이면 안 되고 칸 안쪽 좌우 여백도 함께 줄여야
 * 실제로 눈에 보이는 간격이 반이 된다(두 칸 사이 = px + gap + px).
 */
export const TABS = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/proposals', label: '결재' },
  { href: '/admin/worklog', label: '업무일지' },
  { href: '/admin/seo', label: '키워드' },
  { href: '/admin/visits', label: '방문' },
  { href: '/admin/wed100', label: '100문100답' },
  { href: '/admin/videos', label: '영상' },
  { href: '/admin/dashboard', label: '문항 통계' },
  { href: '/admin/bookings', label: '예약' },
] as const

export default function AdminTabs({ active }: { active: string }) {
  const rail = useRef<HTMLDivElement>(null)
  const here = useRef<HTMLAnchorElement>(null)

  /*
    지금 있는 탭을 보이는 자리로 끌어온다.

    여섯 개가 휴대전화 너비에 다 들어가지 않는다. '예약' 이나 '문항 통계' 에
    들어가면 그 탭이 오른쪽 화면 밖에 있어, 어디에 와 있는지가 안 보였다.
    스크롤 위치를 손으로 맞춰 놓는 대신 열 때 한 번 밀어 준다.
  */
  useEffect(() => {
    const el = here.current
    const box = rail.current
    if (!el || !box) return
    const x = el.offsetLeft - (box.clientWidth - el.clientWidth) / 2
    box.scrollTo({ left: Math.max(0, x) })
  }, [active])

  return (
    /*
      좁은 화면에서는 옆으로 민다.

      여섯 개를 줄바꿈시키면 휴대전화에서 세 줄이 되어 화면 위쪽을 다 먹는다.
      한 줄로 두고 손가락으로 미는 편이 익숙하다. 스크롤바는 감추되, 양 끝에
      옅은 그늘을 두어 "더 있다" 는 것이 보이게 한다 — 스크롤바도 없고 힌트도 없으면
      뒤쪽 탭이 있는 줄을 모른다.
    */
    <nav className="relative min-w-0 flex-1" aria-label="관리 화면">
      <div
        ref={rail}
        className="flex gap-0.5 overflow-x-auto rounded-xl bg-[var(--a-2e2724)] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((t) => {
          const on = t.href === active
          return (
            <Link
              key={t.href}
              href={t.href}
              ref={on ? here : undefined}
              aria-current={on ? 'page' : undefined}
              className={[
                /*
                  고르지 않은 탭도 읽혀야 한다.

                  전에는 #C9BDB6 이었다. 계산상 대비는 8:1 로 기준을 넘는데, 12px
                  글씨를 휴대전화에서 보면 그것으로는 부족했다. 숫자가 아니라 눈에
                  보이는 것이 기준이다. 글자를 밝히고 조금 키웠다.
                */
                'shrink-0 rounded-lg px-1.5 py-2 text-[0.8125rem] font-bold whitespace-nowrap transition-colors',
                on
                  ? 'bg-[var(--color-white)] text-[var(--a-2e2724)]'
                  : 'text-[var(--a-efeae7)] hover:bg-white/15',
              ].join(' ')}
            >
              {t.label}
            </Link>
          )
        })}
      </div>
      {/* 오른쪽에 더 있다는 표시. 그늘이라 손가락을 막지 않는다 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 right-1 w-5 rounded-r-lg bg-gradient-to-l from-[var(--a-2e2724)] to-transparent"
      />
    </nav>
  )
}
