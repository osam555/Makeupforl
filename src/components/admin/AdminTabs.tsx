import Link from 'next/link'

/**
 * 어드민 탭.
 *
 * 화면이 다섯으로 늘면서 서로 오갈 길이 제각각이었다 — 어떤 화면에는 링크가 있고
 * 어떤 화면에는 없었다. 한 줄로 모아 어디서든 같은 자리에 둔다.
 *
 * 검색어를 맨 앞에 둔 것은, 매일 볼 값이 그쪽이기 때문이다. 예약과 콘텐츠는
 * 일이 생겼을 때 들어가는 화면이지만 검색어와 방문은 흐름을 보는 화면이다.
 */
const TABS = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/seo', label: '검색어 목표' },
  { href: '/admin/wed100', label: '100문100답' },
  { href: '/admin/videos', label: '영상' },
  { href: '/admin/dashboard', label: '문항 통계' },
  { href: '/admin/bookings', label: '예약' },
]

export default function AdminTabs({ active }: { active: string }) {
  return (
    /*
      좁은 화면에서는 옆으로 민다.

      여섯 개를 줄바꿈시키면 휴대전화에서 세 줄이 되어 화면 위쪽을 다 먹는다.
      한 줄로 두고 손가락으로 미는 편이 익숙하다. 스크롤바는 감추되, 오른쪽 끝에
      옅은 그늘을 두어 "더 있다" 는 것이 보이게 한다 — 스크롤바도 없고 힌트도 없으면
      뒤쪽 탭이 있는 줄을 모른다.
    */
    <nav className="relative mb-5 -mx-1 rounded-xl bg-[#2E2724] sm:mx-0">
      <div className="flex gap-1.5 overflow-x-auto p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
      {TABS.map((t) => {
        const on = t.href === active
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            className={[
              /*
                고르지 않은 탭도 읽혀야 한다.

                전에는 #C9BDB6 이었다. 계산상 대비는 8:1 로 기준을 넘는데, 12px
                글씨를 휴대전화에서 보면 그것으로는 부족했다. 숫자가 아니라 눈에
                보이는 것이 기준이다. 글자를 밝히고 조금 키웠다.
              */
              'shrink-0 rounded-lg px-3.5 py-2 text-[0.8125rem] font-bold transition-colors',
              on
                ? 'bg-white text-[#2E2724]'
                : 'text-[#EFEAE7] hover:bg-white/15 hover:text-white',
            ].join(' ')}
          >
            {t.label}
          </Link>
        )
      })}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-xl bg-gradient-to-l from-[#2E2724] to-transparent sm:hidden"
      />
    </nav>
  )
}
