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
    <nav className="mb-5 flex flex-wrap gap-1.5 rounded-xl bg-[#2E2724] p-1.5">
      {TABS.map((t) => {
        const on = t.href === active
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            className={[
              'rounded-lg px-3.5 py-2 text-xs font-bold transition-colors',
              on ? 'bg-white text-[#2E2724]' : 'text-[#C9BDB6] hover:bg-white/10 hover:text-white',
            ].join(' ')}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
