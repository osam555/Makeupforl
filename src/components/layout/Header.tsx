'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

type NavItem = { name: string; href: string; sub?: { name: string; href: string }[] }

/** 원본 gnb 구성 + [혼주메이크업 100문100답] 을 브랜드소개 우측에 추가 */
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
  { name: '혼주메이크업 100문100답', href: '/wed100' },
  { name: '샵 / 출장메이크업', href: '/services' },
  { name: '1:1 사전컨설팅', href: '/consultation' },
  {
    name: '갤러리',
    href: '/gallery',
    sub: [
      { name: '혼주', href: '/gallery?cat=혼주' },
      { name: '가족 및 하객', href: '/gallery?cat=가족 및 하객' },
      { name: '웨딩', href: '/gallery?cat=웨딩' },
      { name: '남자메이크업', href: '/gallery?cat=남자 메이크업' },
      { name: '기업행사 & 영상메이크업', href: '/gallery?cat=기업행사&영상메이크업' },
      { name: '화보&프로필', href: '/gallery?cat=화보 & 프로필' },
      { name: '패션쇼', href: '/gallery?cat=패션쇼' },
    ],
  },
  { name: '예약안내', href: '/reservation' },
  { name: '고객후기', href: '/reviews' },
  { name: '교육자료', href: '/education' },
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

  const isActive = (item: NavItem) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href.split('#')[0])

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
