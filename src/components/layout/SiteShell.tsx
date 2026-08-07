'use client'

import { usePathname } from 'next/navigation'

/**
 * 원본 사이트의 body#main / body#sub 구분을 재현한다.
 * - 메인(/)  : 헤더가 메인 비주얼 위에 투명하게 얹힘 (흰 로고/흰 메뉴)
 * - 서브     : 헤더가 흰 배경 + 진한 글자
 */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const isMain = pathname === '/'
  return (
    <div className="mfl-site">
      {/* 원본은 body#main / body#sub — 포팅된 CSS 가 후손 셀렉터라 한 단계 더 감싼다 */}
      <div className={isMain ? 'mfl-main' : 'mfl-sub'}>
        <div className="mfl-wrapper">{children}</div>
      </div>
    </div>
  )
}
