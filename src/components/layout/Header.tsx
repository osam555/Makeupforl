'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'

type NavItem = {
  name: string
  href: string
  sub?: { name: string; href: string }[]
  /** 활성 판정 경로. 없으면 href 로 판단한다 ('/gallery' 와 '/gallery/혼주' 를 갈라야 해서 둔다) */
  match?: { prefix?: string; exact?: string }
}

/**
 * 최상위 항목마다 축을 하나씩만 둔다.
 *   업무분야   = 누구를 위한 것인가 (예전엔 갤러리 서브메뉴에만 있었다)
 *   서비스·예약 = 어디서 어떻게 받나 (샵/출장 + 컨설팅 + 예약을 한 흐름으로 묶었다)
 *   갤러리     = 분야 구분 없이 사진을 몰아 보는 곳
 * 사진이 한 장도 없던 [패션쇼] 는 뺐다. 사진이 생기면 galleryCategories 에 추가하면
 * 이 메뉴와 갤러리 탭에 함께 들어온다.
 */
const navigation: NavItem[] = [
  {
    name: '브랜드소개',
    href: '/brand',
    sub: [
      { name: '대표인사말', href: '/brand' },
      { name: '회사소개', href: '/brand#company' },
      { name: '오시는길', href: '/brand#location' },
    ],
  },
  { name: '혼주메이크업 100문100답', href: '/honjoo100' },
  {
    name: '업무분야',
    href: `/gallery/${GALLERY_CATEGORIES[0].slug}`,
    match: { prefix: '/gallery/' },
    sub: GALLERY_CATEGORIES.map((c) => ({ name: c.menuName, href: `/gallery/${c.slug}` })),
  },
  {
    name: '서비스 · 예약',
    href: '/services',
    sub: [
      { name: '샵 메이크업', href: '/services#shop' },
      { name: '출장 메이크업', href: '/services#visit' },
      { name: '1:1 사전컨설팅', href: '/consultation' },
      { name: '예약안내', href: '/reservation' },
    ],
  },
  { name: '갤러리', href: '/gallery', match: { exact: '/gallery' } },
  { name: '고객후기', href: '/reviews' },
  { name: '유튜브 채널', href: '/videos' },
]

export default function Header({ logo, logoWhite }: { logo?: string; logoWhite?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openSub, setOpenSub] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname() || '/'

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    document.documentElement.classList.toggle('menu-opened', menuOpen)
    return () => document.documentElement.classList.remove('menu-opened')
  }, [menuOpen])

  /** 로고를 빠르게 두 번 누르면 관리자 화면으로 이동 */
  const tapRef = useRef<{ n: number; t: number }>({ n: 0, t: 0 })

  const isActive = (item: NavItem) => {
    if (item.match?.exact) return pathname === item.match.exact
    if (item.match?.prefix) return pathname.startsWith(item.match.prefix)
    return item.href === '/' ? pathname === '/' : pathname.startsWith(item.href.split('#')[0])
  }

  return (
    <>
      <div className="mfl-header">
        <div className="mfl-contain">
          <h1 className="sitelogo">
            <Link
              href="/"
              onClick={(e) => {
                const s = tapRef.current
                const now = Date.now()
                if (now - s.t < 600 && s.n >= 1) {
                  e.preventDefault()
                  s.n = 0
                  router.push('/admin/wed100')
                  return
                }
                s.n = now - s.t < 600 ? s.n + 1 : 1
                s.t = now
              }}
              title="메이크업포엘"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoWhite || '/mfl/images/common/logo.png'} alt="메이크업포엘" className="off" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo || '/mfl/images/common/logo_on.png'} alt="메이크업포엘" className="on" />
            </Link>
          </h1>

          <div className="mfl-gnb">
            <h2 className="blind">주메뉴</h2>
            <ul>
              {navigation.map((item) => (
                <li key={item.name} className={item.sub ? undefined : 'no-sub'}>
                  <Link href={item.href} className={isActive(item) ? 'active' : undefined}>
                    {item.name}
                  </Link>
                  {item.sub && (
                    <div className="submenu">
                      <ul>
                        {item.sub.map((s) => (
                          <li key={s.name}>
                            <Link href={s.href}>{s.name}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="btn-m-menu"
            onClick={() => setMenuOpen(true)}
            aria-label="메뉴 열기"
          >
            <span>메뉴</span>
          </button>
        </div>
        <div className="submenu-bg" />
      </div>

      {/* 모바일 드로어 */}
      <div className="mfl-menu mobile-navigation">
        <nav className="nav-menu">
          <ul>
            {navigation.map((item) => (
              <li key={item.name} className={openSub === item.name ? 'active' : undefined}>
                {item.sub ? (
                  <a
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault()
                      setOpenSub(openSub === item.name ? null : item.name)
                    }}
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link href={item.href} onClick={() => setMenuOpen(false)}>
                    {item.name}
                  </Link>
                )}
                {item.sub && (
                  <div className="submenu" style={{ display: openSub === item.name ? 'block' : 'none' }}>
                    <ul>
                      {item.sub.map((s) => (
                        <li key={s.name}>
                          <Link href={s.href} onClick={() => setMenuOpen(false)}>
                            {s.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <button type="button" className="close" onClick={() => setMenuOpen(false)}>
          닫기
        </button>
      </div>
      <div className="mobile-overlay" onClick={() => setMenuOpen(false)} />
    </>
  )
}
