'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { navigation, isNavActive, type NavItem } from '@/lib/navigation'


export default function Header({ logo, logoWhite }: { logo?: string; logoWhite?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openSub, setOpenSub] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname() || '/'

  /*
    화면이 바뀌면 모바일 드로어를 닫는다.

    효과가 아니라 렌더 도중에 맞춘다 — 효과로 하면 열린 드로어가 한 번 그려진 뒤
    닫히고, React 19 는 그 되풀이를 경고한다. 드로어 안의 링크들은 저마다 닫고
    있지만, 뒤로 가기나 다른 경로로 화면이 바뀌는 길도 있어 여기서 한 번 더 받는다.
  */
  const [shownPath, setShownPath] = useState(pathname)
  if (shownPath !== pathname) {
    setShownPath(pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    document.documentElement.classList.toggle('menu-opened', menuOpen)
    return () => document.documentElement.classList.remove('menu-opened')
  }, [menuOpen])

  /** 로고를 빠르게 두 번 누르면 관리자 화면으로 이동 */
  const tapRef = useRef<{ n: number; t: number }>({ n: 0, t: 0 })

  const isActive = (item: NavItem) => isNavActive(item, pathname)

  return (
    <>
      <div className="mfl-header">
        <div className="mfl-contain">
          {/*
            로고는 h1 이 아니라 div 다.

            옛 PHP 마크업을 그대로 옮겨 오면서 로고가 h1 으로 남아 있었다. 그래서
            모든 페이지에 h1 이 둘이었다 — 로고와 그 페이지의 제목. 검색엔진에는
            "이 페이지가 무엇에 대한 것인가" 가 흐려진다. 102개 문항이 전부
            그랬다. 보이는 모습은 .sitelogo 가 정하므로 화면은 달라지지 않는다.
          */}
          <div className="sitelogo">
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
          </div>

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
              <li
                key={item.name}
                className={[
                  openSub === item.name ? 'active' : '',
                  item.sub ? '' : 'no-sub',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {/*
                  이름을 누르면 곧장 그 페이지로 간다. 예전에는 하위 메뉴가 있으면
                  preventDefault 로 펼치기만 해서 [브랜드소개] 를 눌러도 이동이 안 됐다.
                  펼치기는 오른쪽 화살표 버튼으로 분리한다.
                */}
                <Link href={item.href} onClick={() => setMenuOpen(false)}>
                  {item.name}
                </Link>
                {item.sub && (
                  <button
                    type="button"
                    className="m-sub-toggle"
                    aria-label={`${item.name} 하위 메뉴 ${openSub === item.name ? '접기' : '펼치기'}`}
                    aria-expanded={openSub === item.name}
                    onClick={() => setOpenSub(openSub === item.name ? null : item.name)}
                  />
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
